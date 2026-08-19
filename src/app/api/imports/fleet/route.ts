import { z } from "zod";
import { canMutateFleet } from "@/lib/auth/roles";
import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { FLEET_IMPORT_KINDS, previewFleetCsv, type FleetImportKind } from "@/lib/imports/fleet";
import { managementRecipientIds, notify } from "@/lib/notifications";
import { enforceRateLimit } from "@/lib/api/rate-limit";

const kindSchema = z.enum(FLEET_IMPORT_KINDS);

export async function POST(request: Request) {
  try {
    const user = await requireManagement();
    const limited = await enforceRateLimit({
      bucket: "fleet-import",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const form = await request.formData();
    const file = form.get("file");
    const kind = kindSchema.parse(String(form.get("kind") || "trucks"));
    const commit = form.get("commit") === "true";
    if (commit && !canMutateFleet(user.profile.role)) {
      throw new AuthError("This role is read-only.", "forbidden");
    }
    const duplicateMode = String(form.get("duplicateMode") || "skip") === "update" ? "update" : "skip";
    const sendInvites = form.get("sendInvites") === "true";
    const mappingRaw = form.get("mapping");
    if (!(file instanceof File)) {
      return apiError(400, "invalid_input", "Upload a CSV file.");
    }
    const mapping =
      typeof mappingRaw === "string" && mappingRaw.trim()
        ? (JSON.parse(mappingRaw) as Record<string, string>)
        : undefined;
    const text = await file.text();
    const preview = previewFleetCsv({ text, kind, mapping });
    const valid = preview.rows.filter((row) => !row.error && row.normalized);
    const errors = preview.rows
      .filter((row) => row.error)
      .map((row) => ({ rowNumber: row.rowNumber, message: row.error }));
    const supabase = await createServerSupabaseClient();
    const { data: job } = await supabase
      .from("import_jobs")
      .insert({
        organization_id: user.organization.id,
        uploaded_by: user.authUserId,
        source_filename: file.name,
        kind,
        mapping: preview.mapping,
        preview: preview.rows.slice(0, 50),
        status: commit ? "committed" : "validated",
        row_count: preview.rows.length,
        success_count: commit ? valid.length : 0,
        error_count: errors.length,
        errors,
      })
      .select("id")
      .single();

    let imported = 0;
    if (commit) {
      try {
        imported = await commitFleetImport({
          organizationId: user.organization.id,
          actorId: user.authUserId,
          kind,
          valid,
          duplicateMode,
          sendInvites,
        });
        await supabase.from("import_jobs").update({ success_count: imported }).eq("id", job?.id);
        await supabase.from("app_audit_events").insert({
          organization_id: user.organization.id,
          actor_id: user.authUserId,
          entity_type: "import_job",
          entity_id: job?.id ?? null,
          event_type: "import_committed",
          metadata: { kind, imported, duplicateMode },
        });
        await notify({
          organizationId: user.organization.id,
          recipientIds: await managementRecipientIds(user.organization.id),
          eventType: "import_completed",
          title: "Fleet import completed",
          body: `Imported ${imported} ${kind} row${imported === 1 ? "" : "s"}.`,
          href: "/manage/import",
          entityType: "import_job",
          entityId: job?.id,
        });
      } catch (error) {
        await supabase.from("import_jobs").update({ status: "failed" }).eq("id", job?.id);
        await notify({
          organizationId: user.organization.id,
          recipientIds: await managementRecipientIds(user.organization.id),
          eventType: "import_failed",
          title: "Fleet import failed",
          body: error instanceof Error ? error.message : "Import could not be committed.",
          href: "/manage/import",
          entityType: "import_job",
          entityId: job?.id,
        });
        throw error;
      }
    }

    return apiOk({
      jobId: job?.id,
      kind,
      mapping: preview.mapping,
      headers: preview.headers,
      validCount: valid.length,
      imported,
      errors,
      preview: preview.rows.slice(0, 25),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "import_failed", error instanceof Error ? error.message : "Could not import fleet data.");
  }
}

async function commitFleetImport(input: {
  organizationId: string;
  actorId: string;
  kind: FleetImportKind;
  valid: Array<{ normalized: Record<string, unknown> | null }>;
  duplicateMode: "skip" | "update";
  sendInvites: boolean;
}) {
  const admin = createServiceRoleClient();
  let imported = 0;
  if (input.kind === "trucks") {
    for (const row of input.valid) {
      const truck = row.normalized;
      if (!truck) continue;
      const payload = {
        organization_id: input.organizationId,
        unit_number: truck.unit_number,
        vin: emptyToNull(truck.vin),
        license_plate: emptyToNull(truck.license_plate),
        license_state: emptyToNull(truck.license_state),
        year: truck.year ?? null,
        make: emptyToNull(truck.make),
        model: emptyToNull(truck.model),
        fuel_type: truck.fuel_type ?? "diesel",
        tank_capacity_gallons: truck.tank_capacity_gallons,
        target_mpg: truck.target_mpg,
        week_start_min_gallons: truck.week_start_min_gallons,
        reserve_gallons: truck.reserve_gallons,
        notes: emptyToNull(truck.notes),
        status: truck.status ?? "active",
      };
      const { data: existing } = await admin
        .from("trucks")
        .select("id")
        .eq("organization_id", input.organizationId)
        .eq("unit_number", payload.unit_number)
        .maybeSingle();
      if (existing) {
        if (input.duplicateMode === "update") {
          await admin.from("trucks").update(payload).eq("id", existing.id);
          imported += 1;
        }
        continue;
      }
      const { error } = await admin.from("trucks").insert(payload);
      if (!error) imported += 1;
    }
    return imported;
  }

  if (input.kind === "drivers") {
    for (const row of input.valid) {
      const driver = row.normalized;
      if (!driver) continue;
      const email = String(driver.email);
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("organization_id", input.organizationId)
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        if (input.duplicateMode === "update") {
          await admin
            .from("profiles")
            .update({
              full_name: driver.full_name,
              phone: emptyToNull(driver.phone),
            })
            .eq("id", existing.id);
          imported += 1;
        }
        if (driver.unit_number) {
          await assignByUnit(admin, input.organizationId, existing.id, String(driver.unit_number), input.actorId);
        }
        continue;
      }
      if (!input.sendInvites) continue;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: driver.full_name,
          role: "driver",
          organization_id: input.organizationId,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      });
      if (error || !data.user) continue;
      await admin.from("profiles").upsert({
        id: data.user.id,
        organization_id: input.organizationId,
        full_name: driver.full_name,
        email,
        phone: emptyToNull(driver.phone),
        role: "driver",
        is_active: true,
      });
      if (driver.unit_number) {
        await assignByUnit(admin, input.organizationId, data.user.id, String(driver.unit_number), input.actorId);
      }
      imported += 1;
    }
    return imported;
  }

  for (const row of input.valid) {
    const assignment = row.normalized;
    if (!assignment) continue;
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("email", assignment.email)
      .maybeSingle();
    if (!profile) continue;
    const assigned = await assignByUnit(
      admin,
      input.organizationId,
      profile.id,
      String(assignment.unit_number),
      input.actorId,
      typeof assignment.starts_at === "string" ? assignment.starts_at : undefined,
    );
    if (assigned) imported += 1;
  }
  return imported;
}

function emptyToNull(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

async function assignByUnit(
  admin: ReturnType<typeof createServiceRoleClient>,
  organizationId: string,
  driverId: string,
  unitNumber: string,
  actorId: string,
  startsAt?: string,
) {
  const { data: truck } = await admin
    .from("trucks")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("unit_number", unitNumber)
    .maybeSingle();
  if (!truck) return false;
  await admin.from("driver_truck_assignments").update({ ends_at: new Date().toISOString() }).eq("truck_id", truck.id).is("ends_at", null);
  await admin.from("driver_truck_assignments").update({ ends_at: new Date().toISOString() }).eq("driver_id", driverId).is("ends_at", null);
  const { error } = await admin.from("driver_truck_assignments").insert({
    organization_id: organizationId,
    truck_id: truck.id,
    driver_id: driverId,
    created_by: actorId,
    starts_at: startsAt || new Date().toISOString(),
  });
  return !error;
}
