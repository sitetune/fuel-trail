import { z } from "zod";
import { duplicateReceiptSignature, estimateFuel, isoDateInTimezone, sha256Hex } from "@/lib/calculations";
import { derivePricePerGallon, receiptReviewSchema, validateReceiptMath } from "@/lib/validation/receipt";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ReceiptStatus, SessionUser } from "@/types/domain";
import { getReceiptOcrProvider } from "@/lib/ocr";
import { managementRecipientIds, notify } from "@/lib/notifications";
import { ensureDisplayCopy } from "@/lib/receipts/display-image";
import { assertReceiptTransition, driverCanReplaceImage, isLowOcrConfidence } from "./states";

export function storageOriginalPath(input: {
  organizationId: string;
  truckId: string;
  receiptId: string;
  purchasedAt: Date;
  ext: string;
}) {
  const year = input.purchasedAt.getUTCFullYear();
  const month = String(input.purchasedAt.getUTCMonth() + 1).padStart(2, "0");
  return `${input.organizationId}/${input.truckId}/${year}/${month}/${input.receiptId}/original-${crypto.randomUUID()}.${input.ext}`;
}

export async function getActiveAssignment(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("driver_truck_assignments")
    .select("*, trucks(*)")
    .eq("driver_id", userId)
    .is("ends_at", null)
    .maybeSingle();
  return data;
}

export async function initiateReceipt(user: SessionUser, body: { clientReceiptUuid: string; fileName: string; contentType: string }) {
  const assignment = await getActiveAssignment(user.authUserId);
  if (!assignment) {
    throw new Error("No active truck assignment.");
  }
  const ext = (body.fileName.split(".").pop() ?? "jpg").toLowerCase().replace("jpeg", "jpg");
  const receiptId = crypto.randomUUID();
  const path = storageOriginalPath({
    organizationId: user.organization.id,
    truckId: assignment.truck_id,
    receiptId,
    purchasedAt: new Date(),
    ext,
  });
  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("fuel_receipts")
    .select("id, original_image_path")
    .eq("client_receipt_uuid", body.clientReceiptUuid)
    .maybeSingle();
  if (existing) {
    return { receiptId: existing.id, path: existing.original_image_path, reused: true };
  }
  const { error } = await supabase.from("fuel_receipts").insert({
    id: receiptId,
    organization_id: user.organization.id,
    truck_id: assignment.truck_id,
    driver_id: user.authUserId,
    assignment_id: assignment.id,
    status: "draft",
    original_image_path: path,
    client_receipt_uuid: body.clientReceiptUuid,
    purchaser_name: user.profile.full_name,
  });
  if (error) throw new Error("Could not create receipt draft.");
  await supabase.from("receipt_audit_events").insert({
    organization_id: user.organization.id,
    receipt_id: receiptId,
    actor_id: user.authUserId,
    event_type: "captured",
    metadata: { path },
  });
  const admin = createServiceRoleClient();
  const { data: signed, error: signedError } = await admin.storage
    .from("fuel-receipts")
    .createSignedUploadUrl(path);
  if (signedError || !signed) throw new Error("Could not authorize upload.");
  return {
    receiptId,
    path,
    token: signed.token,
    signedUrl: signed.signedUrl,
    reused: false,
  };
}

function throwIfError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export async function completeUpload(user: SessionUser, receiptId: string, sha256: string) {
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("*")
    .eq("id", receiptId)
    .single();
  if (!receipt) throw new Error("Receipt not found.");
  if (receipt.original_sha256 && receipt.original_sha256 !== sha256) {
    throw new Error("Original image is already stored and cannot be replaced.");
  }
  const { data: exactDup } = await supabase
    .from("fuel_receipts")
    .select("id")
    .eq("organization_id", user.organization.id)
    .eq("original_sha256", sha256)
    .neq("id", receiptId)
    .maybeSingle();
  const { error: uploadError } = await supabase
    .from("fuel_receipts")
    .update({
      original_sha256: sha256,
      status: "processing",
      duplicate_of: exactDup?.id ?? receipt.duplicate_of,
    })
    .eq("id", receiptId);
  throwIfError(uploadError, "Could not confirm the uploaded image.");
  await supabase.from("receipt_audit_events").insert({
    organization_id: user.organization.id,
    receipt_id: receiptId,
    actor_id: user.authUserId,
    event_type: "uploaded",
    metadata: { sha256, exactDuplicateOf: exactDup?.id ?? null },
  });
  void ensureDisplayCopy({
    receiptId,
    organizationId: user.organization.id,
    truckId: receipt.truck_id,
    originalPath: receipt.original_image_path,
  });
  await notify({
    organizationId: user.organization.id,
    recipientIds: [user.authUserId],
    eventType: "receipt_uploaded",
    title: "Receipt uploaded",
    body: "Your receipt photo was stored. Confirm the extracted details next.",
    href: `/driver/receipts/${receiptId}`,
    entityType: "fuel_receipt",
    entityId: receiptId,
  });
  return { exactDuplicateOf: exactDup?.id ?? null };
}

export async function runOcr(
  user: SessionUser,
  receiptId: string,
  options?: { rawText?: string | null },
) {
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase.from("fuel_receipts").select("*").eq("id", receiptId).single();
  if (!receipt?.original_image_path) throw new Error("Receipt image is not uploaded.");
  const admin = createServiceRoleClient();
  const { data: file, error } = await admin.storage.from("fuel-receipts").download(receipt.original_image_path);
  if (error || !file) throw new Error("Could not read stored receipt.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const provider = getReceiptOcrProvider();
  try {
    let extracted = await provider.analyze({
      bytes,
      mimeType: file.type || "image/jpeg",
      fileName: "receipt.jpg",
    });
    if (options?.rawText) {
      const { mergeExtractions, parseFuelReceiptText } = await import("@/lib/ocr/parse-text");
      extracted = mergeExtractions(extracted, parseFuelReceiptText(options.rawText));
      extracted.rawText = options.rawText;
    }
    const { providerRaw, ...publicExtracted } = extracted;
    const purchasedAt = isoFromOcrDate(publicExtracted.purchasedAt.value);
    await supabase
      .from("fuel_receipts")
      .update({
        status: "needs_review",
        ocr_provider: publicExtracted.provider,
        ocr_provider_document_id: publicExtracted.providerDocumentId,
        ocr_confidence: publicExtracted.overallConfidence,
        ocr_raw_json: { rawText: publicExtracted.rawText, vision: providerRaw ?? null },
        ocr_extracted_json: publicExtracted,
        merchant_name: publicExtracted.merchantName.value,
        merchant_address: publicExtracted.merchantAddress.value,
        merchant_city: publicExtracted.merchantCity.value,
        merchant_region: publicExtracted.merchantRegion.value,
        merchant_postal_code: publicExtracted.merchantPostalCode.value,
        purchased_at: purchasedAt,
        receipt_number: publicExtracted.receiptNumber.value,
        gallons: publicExtracted.gallons.value,
        price_per_gallon: publicExtracted.pricePerGallon.value,
        subtotal_amount: publicExtracted.subtotalAmount.value,
        tax_amount: publicExtracted.taxAmount.value,
        total_amount: publicExtracted.totalAmount.value,
        fuel_type: publicExtracted.fuelType.value ?? "diesel",
      })
      .eq("id", receiptId);
    await supabase.from("receipt_audit_events").insert({
      organization_id: user.organization.id,
      receipt_id: receiptId,
      actor_id: user.authUserId,
      event_type: "ocr_completed",
      metadata: { provider: publicExtracted.provider, warnings: publicExtracted.warnings },
    });
    const managers = await managementRecipientIds(user.organization.id);
    await notify({
      organizationId: user.organization.id,
      recipientIds: [user.authUserId],
      eventType: "ocr_needs_review",
      title: "Confirm this receipt",
      body: publicExtracted.merchantName.value
        ? `Review the details from ${publicExtracted.merchantName.value}.`
        : "We could not fully read this receipt. Confirm the values from the photo.",
      href: `/driver/receipts/${receiptId}`,
      entityType: "fuel_receipt",
      entityId: receiptId,
    });
    if (isLowOcrConfidence(publicExtracted.overallConfidence)) {
      await notify({
        organizationId: user.organization.id,
        recipientIds: managers,
        eventType: "ocr_low_confidence",
        title: "Low-confidence OCR",
        body: "A receipt needs review because OCR confidence is low.",
        href: `/manage/receipts/${receiptId}`,
        entityType: "fuel_receipt",
        entityId: receiptId,
      });
    }
    return publicExtracted;
  } catch {
    await supabase.from("fuel_receipts").update({ status: "needs_review", ocr_provider: "manual" }).eq("id", receiptId);
    await supabase.from("receipt_audit_events").insert({
      organization_id: user.organization.id,
      receipt_id: receiptId,
      actor_id: user.authUserId,
      event_type: "ocr_failed",
    });
    const managers = await managementRecipientIds(user.organization.id);
    await notify({
      organizationId: user.organization.id,
      recipientIds: [...managers, user.authUserId],
      eventType: "ocr_low_confidence",
      title: "Receipt needs manual review",
      body: "Automatic reading failed. Confirm the values from the photo.",
      href: user.profile.role === "driver" ? `/driver/receipts/${receiptId}` : `/manage/receipts/${receiptId}`,
      entityType: "fuel_receipt",
      entityId: receiptId,
    });
    if (options?.rawText) {
      const { parseFuelReceiptText } = await import("@/lib/ocr/parse-text");
      return parseFuelReceiptText(options.rawText);
    }
    return getReceiptOcrProvider().analyze({
      bytes,
      mimeType: "image/jpeg",
      fileName: "receipt.jpg",
    });
  }
}

function isoFromOcrDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function receiptImageBytes(user: SessionUser, receiptId: string, options?: { original?: boolean }) {
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("original_image_path, display_image_path")
    .eq("id", receiptId)
    .single();
  if (!receipt?.original_image_path) throw new Error("Receipt not found.");
  const path =
    !options?.original && receipt.display_image_path ? receipt.display_image_path : receipt.original_image_path;
  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from("fuel-receipts").download(path);
  if (error || !data) throw new Error("Could not read stored receipt.");
  return { bytes: new Uint8Array(await data.arrayBuffer()), mimeType: data.type || "image/jpeg" };
}

export async function submitReceipt(user: SessionUser, receiptId: string, payload: unknown) {
  const parsed = receiptReviewSchema.parse(payload);
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase.from("fuel_receipts").select("*, trucks(*)").eq("id", receiptId).single();
  if (!receipt) throw new Error("Receipt not found.");
  const truck = receipt.trucks as { tank_capacity_gallons: number; target_mpg: number; id: string };
  const { data: previous } = await supabase
    .from("fuel_receipts")
    .select("odometer")
    .eq("truck_id", receipt.truck_id)
    .in("status", ["submitted", "verified"])
    .order("purchased_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const warnings = validateReceiptMath(
    { ...parsed, tankCapacityGallons: Number(truck.tank_capacity_gallons), previousOdometer: previous?.odometer },
  );
  const { pricePerGallon, derived } = derivePricePerGallon(parsed);
  const signature = duplicateReceiptSignature({
    organizationId: user.organization.id,
    truckId: parsed.truckId,
    purchasedAtIsoDate: isoDateInTimezone(new Date(parsed.purchasedAt), user.organization.timezone),
    merchantName: parsed.merchantName,
    gallons: parsed.gallons,
    totalAmount: parsed.totalAmount,
  });
  const { data: likelyDup } = await supabase
    .from("fuel_receipts")
    .select("id")
    .eq("organization_id", user.organization.id)
    .eq("receipt_signature", signature)
    .neq("id", receiptId)
    .in("status", ["submitted", "verified", "needs_review"])
    .maybeSingle();

  const { data: latestEstimate } = await supabase
    .from("latest_fuel_estimates")
    .select("*")
    .eq("truck_id", parsed.truckId)
    .maybeSingle();

  const estimate = estimateFuel({
    tankCapacityGallons: Number(truck.tank_capacity_gallons),
    targetMpg: Number(truck.target_mpg),
    purchasedGallons: parsed.gallons,
    tankLevelAfterMode: parsed.tankLevelAfterMode,
    tankLevelAfterValue: parsed.tankLevelAfterValue ?? null,
    currentOdometer: parsed.odometer ?? null,
    previousEstimatedAfterGallons: latestEstimate?.estimated_after_gallons ?? null,
    previousOdometer: latestEstimate?.odometer ?? null,
    baselineGallons: null,
    baselineOdometer: null,
  });

  const overCapacity = warnings.some((warning) => warning.code === "over_capacity");
  const nextStatus: ReceiptStatus = likelyDup || overCapacity ? "needs_review" : "submitted";
  const currentStatus = receipt.status as ReceiptStatus;
  assertReceiptTransition(currentStatus, nextStatus);
  const resubmitting = currentStatus === "rejected";

  const fieldChanges = {
    gallons: { before: receipt.gallons, after: parsed.gallons },
    total_amount: { before: receipt.total_amount, after: parsed.totalAmount },
    merchant_name: { before: receipt.merchant_name, after: parsed.merchantName },
  };

  const { error: submitError } = await supabase
    .from("fuel_receipts")
    .update({
      truck_id: parsed.truckId,
      purchased_at: parsed.purchasedAt,
      merchant_name: parsed.merchantName,
      merchant_address: parsed.merchantAddress,
      merchant_city: parsed.merchantCity,
      merchant_region: parsed.merchantRegion,
      merchant_postal_code: parsed.merchantPostalCode,
      receipt_number: parsed.receiptNumber,
      purchaser_name: parsed.purchaserName,
      fuel_type: parsed.fuelType,
      gallons: parsed.gallons,
      price_per_gallon: pricePerGallon,
      price_per_gallon_derived: derived,
      subtotal_amount: parsed.subtotalAmount,
      tax_amount: parsed.taxAmount,
      total_amount: parsed.totalAmount,
      odometer: parsed.odometer,
      payment_last4: parsed.paymentLast4,
      tank_level_after_mode: parsed.tankLevelAfterMode,
      tank_level_after_value: parsed.tankLevelAfterValue,
      trailer_attached: parsed.trailerAttached,
      driver_note: parsed.driverNote,
      receipt_signature: signature,
      duplicate_of: likelyDup?.id ?? receipt.duplicate_of,
      warnings,
      status: nextStatus,
      submitted_at: nextStatus === "submitted" || resubmitting ? new Date().toISOString() : receipt.submitted_at,
      rejected_at: resubmitting ? null : receipt.rejected_at,
      rejected_by: resubmitting ? null : receipt.rejected_by,
      rejection_reason: resubmitting ? null : receipt.rejection_reason,
    })
    .eq("id", receiptId);
  throwIfError(submitError, "Could not submit receipt.");

  await supabase.from("receipt_audit_events").insert({
    organization_id: user.organization.id,
    receipt_id: receiptId,
    actor_id: user.authUserId,
    event_type: resubmitting ? "resubmitted" : "submitted",
    field_changes: fieldChanges,
    metadata: { warnings, likelyDuplicateOf: likelyDup?.id ?? null },
  });

  await supabase.from("fuel_level_estimates").insert({
    organization_id: user.organization.id,
    truck_id: parsed.truckId,
    receipt_id: receiptId,
    estimated_before_gallons: estimate.estimatedBeforeGallons,
    purchased_gallons: estimate.purchasedGallons,
    estimated_after_gallons: estimate.estimatedAfterGallons,
    odometer: estimate.odometer,
    confidence: estimate.confidence,
    method: estimate.method,
    calculation_json: { ...estimate.calculation, reasons: estimate.reasons },
  });

  const managers = await managementRecipientIds(user.organization.id);
  await notify({
    organizationId: user.organization.id,
    recipientIds: managers,
    eventType: resubmitting ? "receipt_resubmitted" : "receipt_submitted",
    title: resubmitting ? "Rejected receipt resubmitted" : "New receipt submitted",
    body: `${parsed.merchantName} · ${parsed.gallons} gal`,
    href: `/manage/receipts/${receiptId}`,
    entityType: "fuel_receipt",
    entityId: receiptId,
  });
  if (likelyDup) {
    await notify({
      organizationId: user.organization.id,
      recipientIds: managers,
      eventType: "possible_duplicate",
      title: "Possible duplicate receipt",
      body: `${parsed.merchantName} may already have a matching receipt.`,
      href: `/manage/receipts/${receiptId}`,
      entityType: "fuel_receipt",
      entityId: receiptId,
    });
  }

  return {
    status: nextStatus,
    warnings,
    likelyDuplicateOf: likelyDup?.id ?? null,
    gallons: parsed.gallons,
    truckId: parsed.truckId,
  };
}

export const verifySchema = z.object({
  action: z.enum(["verify", "reject", "override_duplicate", "archive", "amend"]),
  reason: z.string().optional(),
  managerNote: z.string().optional(),
  corrections: z
    .object({
      truck_id: z.string().uuid().optional(),
      driver_id: z.string().uuid().optional(),
      purchased_at: z.string().optional(),
      merchant_name: z.string().optional(),
      merchant_address: z.string().optional(),
      merchant_city: z.string().optional(),
      merchant_region: z.string().optional(),
      merchant_postal_code: z.string().nullable().optional(),
      receipt_number: z.string().nullable().optional(),
      fuel_type: z.string().optional(),
      gallons: z.coerce.number().positive().optional(),
      price_per_gallon: z.coerce.number().positive().nullable().optional(),
      subtotal_amount: z.coerce.number().nonnegative().nullable().optional(),
      tax_amount: z.coerce.number().nonnegative().nullable().optional(),
      other_purchases_amount: z.coerce.number().nonnegative().nullable().optional(),
      total_amount: z.coerce.number().positive().optional(),
      odometer: z.coerce.number().nonnegative().nullable().optional(),
      payment_last4: z
        .string()
        .regex(/^\d{4}$/)
        .nullable()
        .optional(),
      trailer_attached: z.boolean().nullable().optional(),
      trailer_dropped: z.boolean().optional(),
      trailer_parking_notes: z.string().nullable().optional(),
      driver_note: z.string().nullable().optional(),
      manager_note: z.string().nullable().optional(),
    })
    .optional(),
});

export async function manageReceipt(user: SessionUser, receiptId: string, payload: z.infer<typeof verifySchema>) {
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase.from("fuel_receipts").select("*").eq("id", receiptId).single();
  if (!receipt) throw new Error("Receipt not found.");
  const currentStatus = receipt.status as ReceiptStatus;
  const updates: Record<string, unknown> = {};
  const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};
  if (payload.action !== "reject" && payload.corrections) {
    for (const [key, value] of Object.entries(payload.corrections)) {
      if (value === undefined) continue;
      fieldChanges[key] = { before: receipt[key as keyof typeof receipt], after: value };
      updates[key] = value;
    }
  }
  if (payload.managerNote) {
    updates.manager_note = payload.managerNote;
  }
  let nextStatus = currentStatus;
  if (payload.action === "verify") {
    nextStatus = "verified";
    updates.status = "verified";
    updates.verified_at = new Date().toISOString();
    updates.verified_by = user.authUserId;
  }
  if (payload.action === "reject") {
    nextStatus = "rejected";
    updates.status = "rejected";
    updates.rejection_reason = payload.reason?.trim() || "Rejected";
    updates.rejected_at = new Date().toISOString();
    updates.rejected_by = user.authUserId;
    if (payload.managerNote) updates.manager_note = payload.managerNote;
  }
  if (payload.action === "override_duplicate") {
    nextStatus = "verified";
    updates.duplicate_override = true;
    updates.status = "verified";
    updates.verified_at = new Date().toISOString();
    updates.verified_by = user.authUserId;
  }
  if (payload.action === "archive") {
    nextStatus = "archived";
    updates.status = "archived";
  }
  if (payload.action === "amend") {
    nextStatus = "verified";
    updates.status = "verified";
    updates.amended_at = new Date().toISOString();
  }
  if (
    currentStatus === "verified" &&
    receipt.last_reported_at &&
    payload.action !== "archive" &&
    Object.keys(fieldChanges).length > 0
  ) {
    updates.amended_at = new Date().toISOString();
  }
  assertReceiptTransition(currentStatus, nextStatus);
  const { error: updateError } = await supabase.from("fuel_receipts").update(updates).eq("id", receiptId);
  throwIfError(updateError, "Could not update receipt status.");
  const { error: auditError } = await supabase.from("receipt_audit_events").insert({
    organization_id: user.organization.id,
    receipt_id: receiptId,
    actor_id: user.authUserId,
    event_type:
      payload.action === "verify"
        ? "verified"
        : payload.action === "reject"
          ? "rejected"
          : payload.action === "override_duplicate"
            ? "duplicate_overridden"
            : payload.action === "amend"
              ? "field_corrected"
              : "archived",
    field_changes: Object.keys(fieldChanges).length ? fieldChanges : { status: { before: currentStatus, after: nextStatus } },
    metadata: { reason: payload.reason ?? null, from: currentStatus, to: nextStatus },
  });
  throwIfError(auditError, "Receipt was updated but the audit event could not be recorded.");
  if (payload.action === "verify" || payload.action === "override_duplicate") {
    await notify({
      organizationId: user.organization.id,
      recipientIds: [receipt.driver_id],
      eventType: "receipt_verified",
      title: "Receipt verified",
      body: "A manager accepted this fuel receipt.",
      href: `/driver/receipts/${receiptId}`,
      entityType: "fuel_receipt",
      entityId: receiptId,
    });
  }
  if (payload.action === "reject") {
    await notify({
      organizationId: user.organization.id,
      recipientIds: [receipt.driver_id],
      eventType: "receipt_rejected",
      title: "Receipt rejected — action required",
      body: payload.reason?.trim() || "A manager asked you to correct this receipt.",
      href: `/driver/receipts/${receiptId}`,
      entityType: "fuel_receipt",
      entityId: receiptId,
    });
  }
  return { ok: true, status: nextStatus };
}

export async function initiateImageReplace(user: SessionUser, receiptId: string, fileName: string) {
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase.from("fuel_receipts").select("*").eq("id", receiptId).single();
  if (!receipt) throw new Error("Receipt not found.");
  if (receipt.driver_id !== user.authUserId) throw new Error("Only the submitting driver can replace this image.");
  if (!driverCanReplaceImage(receipt.status as ReceiptStatus)) {
    throw new Error("This receipt image can no longer be replaced.");
  }
  const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase().replace("jpeg", "jpg");
  const path = storageOriginalPath({
    organizationId: user.organization.id,
    truckId: receipt.truck_id,
    receiptId,
    purchasedAt: receipt.purchased_at ? new Date(receipt.purchased_at) : new Date(),
    ext,
  });
  const { error } = await supabase.from("fuel_receipts").update({ pending_original_path: path }).eq("id", receiptId);
  throwIfError(error, "Could not start image replacement.");
  const admin = createServiceRoleClient();
  const { data: signed, error: signedError } = await admin.storage.from("fuel-receipts").createSignedUploadUrl(path);
  if (signedError || !signed) throw new Error("Could not authorize replacement upload.");
  return { receiptId, path, token: signed.token, signedUrl: signed.signedUrl };
}

export async function completeImageReplace(user: SessionUser, receiptId: string, sha256: string) {
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase.from("fuel_receipts").select("*").eq("id", receiptId).single();
  if (!receipt) throw new Error("Receipt not found.");
  if (receipt.driver_id !== user.authUserId) throw new Error("Only the submitting driver can replace this image.");
  const pendingPath = receipt.pending_original_path as string | null;
  if (!pendingPath) throw new Error("No replacement image is waiting to be saved.");
  const prior = Array.isArray(receipt.prior_original_paths) ? receipt.prior_original_paths : [];
  if (receipt.original_image_path) prior.push(receipt.original_image_path);
  const currentStatus = receipt.status as ReceiptStatus;
  assertReceiptTransition(currentStatus, "needs_review");
  const { error } = await supabase
    .from("fuel_receipts")
    .update({
      prior_original_paths: prior,
      original_image_path: pendingPath,
      pending_original_path: null,
      original_sha256: sha256,
      version: Number(receipt.version ?? 1) + 1,
      status: "needs_review",
    })
    .eq("id", receiptId);
  throwIfError(error, "Could not save the replacement image.");
  await supabase.from("receipt_audit_events").insert({
    organization_id: user.organization.id,
    receipt_id: receiptId,
    actor_id: user.authUserId,
    event_type: "image_replaced",
    metadata: { previousPath: receipt.original_image_path, path: pendingPath, sha256 },
  });
  void ensureDisplayCopy({
    receiptId,
    organizationId: user.organization.id,
    truckId: receipt.truck_id,
    originalPath: pendingPath,
  });
  const managers = await managementRecipientIds(user.organization.id);
  await notify({
    organizationId: user.organization.id,
    recipientIds: managers,
    eventType: "receipt_image_replaced",
    title: "Receipt image replaced",
    body: "A driver uploaded a replacement photo for review.",
    href: `/manage/receipts/${receiptId}`,
    entityType: "fuel_receipt",
    entityId: receiptId,
  });
  return { receiptId, path: pendingPath };
}

export async function signedReceiptImage(user: SessionUser, receiptId: string, options?: { original?: boolean }) {
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("original_image_path, display_image_path")
    .eq("id", receiptId)
    .single();
  if (!receipt?.original_image_path) throw new Error("Receipt not found.");
  const path =
    !options?.original && receipt.display_image_path ? receipt.display_image_path : receipt.original_image_path;
  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from("fuel-receipts").createSignedUrl(path, 60);
  if (error || !data) throw new Error("Could not sign image URL.");
  return { url: data.signedUrl, expiresIn: 60 };
}

export { sha256Hex };
