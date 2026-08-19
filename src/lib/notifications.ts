import { createServiceRoleClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/notifications/email";

export const NOTIFICATION_EVENTS = [
  "receipt_uploaded",
  "ocr_needs_review",
  "ocr_low_confidence",
  "receipt_submitted",
  "receipt_verified",
  "receipt_rejected",
  "receipt_resubmitted",
  "receipt_image_replaced",
  "possible_duplicate",
  "import_completed",
  "import_failed",
  "unreviewed_aging",
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

type NotifyInput = {
  organizationId: string;
  recipientIds: string[];
  eventType: NotificationEvent;
  title: string;
  body: string;
  href?: string;
  entityType?: string;
  entityId?: string;
  idempotencyKey?: string;
};

export async function notify(input: NotifyInput) {
  const recipientIds = [...new Set(input.recipientIds.filter(Boolean))];
  if (recipientIds.length === 0) return;
  try {
    const admin = createServiceRoleClient();
    const [{ data: profiles }, { data: prefs }] = await Promise.all([
      admin.from("profiles").select("id, email").in("id", recipientIds),
      admin.from("notification_preferences").select("profile_id, email_events").in("profile_id", recipientIds),
    ]);
    const emailById = new Map((profiles ?? []).map((row) => [row.id as string, row.email as string]));
    const prefsById = new Map(
      (prefs ?? []).map((row) => [row.profile_id as string, (row.email_events ?? {}) as Record<string, boolean>]),
    );
    const rows = [];
    for (const recipientId of recipientIds) {
      const wantsEmail = Boolean(prefsById.get(recipientId)?.[input.eventType]);
      const to = emailById.get(recipientId);
      let emailStatus: "skipped" | "sent" | "failed" = "skipped";
      if (wantsEmail && to) {
        try {
          emailStatus = await sendNotificationEmail({
            to,
            eventType: input.eventType,
            title: input.title,
            body: input.body,
            href: input.href,
          });
        } catch {
          emailStatus = "failed";
        }
      }
      rows.push({
        organization_id: input.organizationId,
        recipient_id: recipientId,
        event_type: input.eventType,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        email_status: emailStatus,
        idempotency_key: `${input.idempotencyKey ?? `${input.eventType}:${input.entityId ?? "none"}`}:${recipientId}`,
      });
    }
    const { error } = await admin.from("notifications").upsert(rows, {
      onConflict: "idempotency_key",
      ignoreDuplicates: true,
    });
    if (error) {
      await admin.from("app_audit_events").insert({
        organization_id: input.organizationId,
        entity_type: input.entityType ?? "notification",
        entity_id: input.entityId ?? null,
        event_type: "notification_failed",
        metadata: { message: error.message, eventType: input.eventType },
      });
    }
  } catch {
    // Receipt actions must succeed even if notification delivery fails.
  }
}

export async function managementRecipientIds(organizationId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["owner_admin", "manager"]);
  return (data ?? []).map((row) => row.id);
}

export async function notifyAgingReceipts(organizationId: string) {
  try {
    const admin = createServiceRoleClient();
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: aging } = await admin
      .from("fuel_receipts")
      .select("id, merchant_name, submitted_at, created_at")
      .eq("organization_id", organizationId)
      .in("status", ["submitted", "needs_review"])
      .lt("created_at", cutoff)
      .limit(20);
    if (!aging?.length) return;
    const recipients = await managementRecipientIds(organizationId);
    const week = new Date().toISOString().slice(0, 10);
    for (const receipt of aging) {
      await notify({
        organizationId,
        recipientIds: recipients,
        eventType: "unreviewed_aging",
        title: "Unreviewed receipt is aging",
        body: `${receipt.merchant_name ?? "A receipt"} has waited more than 48 hours for review.`,
        href: `/manage/receipts/${receipt.id}`,
        entityType: "fuel_receipt",
        entityId: receipt.id,
        idempotencyKey: `unreviewed_aging:${receipt.id}:${week}`,
      });
    }
  } catch {
    // Layout rendering must not fail if aging alerts cannot be written.
  }
}
