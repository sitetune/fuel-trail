"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function setOrganizationStatusAction(formData: FormData) {
  const adminUser = await requirePlatformAdmin();
  const organizationId = String(formData.get("organizationId"));
  const status = String(formData.get("status"));
  if (!["active", "pending_activation", "deactivated"].includes(status)) {
    redirect("/internal");
  }
  const admin = createServiceRoleClient();
  await admin.from("organizations").update({ status }).eq("id", organizationId);
  await admin.from("app_audit_events").insert({
    organization_id: organizationId,
    actor_id: adminUser.authUserId,
    entity_type: "organization",
    entity_id: organizationId,
    event_type: "organization_status_changed",
    metadata: { status, actorEmail: adminUser.profile.email },
  });
  redirect(`/internal/orgs/${organizationId}`);
}

export async function grantSupportAccessAction(formData: FormData) {
  const adminUser = await requirePlatformAdmin();
  const organizationId = String(formData.get("organizationId"));
  const reason = String(formData.get("reason") || "").trim();
  const hours = Math.min(24, Math.max(1, Number(formData.get("hours") || 4)));
  if (reason.length < 8) redirect(`/internal/orgs/${organizationId}?error=reason`);
  const admin = createServiceRoleClient();
  const endsAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  await admin.from("support_access_grants").insert({
    organization_id: organizationId,
    actor_email: adminUser.profile.email,
    reason,
    ends_at: endsAt,
  });
  await admin.from("app_audit_events").insert({
    organization_id: organizationId,
    actor_id: adminUser.authUserId,
    entity_type: "support_access",
    entity_id: organizationId,
    event_type: "support_access_granted",
    metadata: { reason, hours, actorEmail: adminUser.profile.email, endsAt },
  });
  redirect(`/internal/orgs/${organizationId}?granted=1`);
}
