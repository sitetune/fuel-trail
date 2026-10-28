import { notify } from "@/lib/notifications";
import {
  DRIVER_FUEL_STOP_SELECT,
  driverFuelStopHref,
  driverFuelStopNotificationBody,
  enrichDriverFuelStop,
  resolveDriverFuelStop,
  type DriverFuelStopPlan,
} from "@/lib/routing/driver-stop";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/domain";

export async function notifyDriverOfFuelStop(input: {
  user: SessionUser;
  planId: string;
  truckUnit: string;
  driverId: string | null;
  resend?: boolean;
}) {
  if (!input.driverId) return { notified: false, reason: "No driver is assigned to this truck." };
  const supabase = await createServerSupabaseClient();
  const { data: plan } = await supabase
    .from("route_plans")
    .select(DRIVER_FUEL_STOP_SELECT)
    .eq("id", input.planId)
    .eq("organization_id", input.user.organization.id)
    .maybeSingle();
  if (!plan) return { notified: false, reason: "Plan not found." };
  const stop = await enrichDriverFuelStop(resolveDriverFuelStop(plan as DriverFuelStopPlan));
  await notify({
    organizationId: input.user.organization.id,
    recipientIds: [input.driverId],
    eventType: "fuel_stop_issued",
    title: `Fuel stop for unit ${input.truckUnit}`,
    body: driverFuelStopNotificationBody(stop),
    href: driverFuelStopHref(input.planId),
    entityType: "route_plan",
    entityId: input.planId,
    idempotencyKey: input.resend
      ? `fuel_stop_issued:${input.planId}:${Date.now()}`
      : `fuel_stop_issued:${input.planId}`,
  });
  return { notified: true as const };
}

export async function issueRoutePlanToDriver(user: SessionUser, planId: string, resend = false) {
  const supabase = await createServerSupabaseClient();
  const { data: plan } = await supabase
    .from("route_plans")
    .select("id, truck_id, driver_id, trucks(unit_number)")
    .eq("id", planId)
    .eq("organization_id", user.organization.id)
    .maybeSingle();
  if (!plan) return { ok: false as const, message: "Plan not found." };

  let driverId = (plan.driver_id as string | null) ?? null;
  if (!driverId) {
    const { data: assignment } = await supabase
      .from("driver_truck_assignments")
      .select("driver_id")
      .eq("truck_id", plan.truck_id)
      .is("ends_at", null)
      .maybeSingle();
    driverId = assignment?.driver_id ?? null;
  }
  if (!driverId) return { ok: false as const, message: "Assign a driver to this truck first." };

  await supabase
    .from("route_plans")
    .update({ status: "issued", driver_id: driverId })
    .eq("id", planId)
    .eq("organization_id", user.organization.id);

  const result = await notifyDriverOfFuelStop({
    user,
    planId,
    truckUnit: (plan.trucks as { unit_number?: string } | null)?.unit_number ?? "",
    driverId,
    resend,
  });
  if (!result.notified) return { ok: false as const, message: result.reason ?? "Could not notify the driver." };
  return { ok: true as const };
}

const ISSUED_STOP_TTL_MS = 24 * 60 * 60 * 1000;

export async function expireStaleIssuedPlans(organizationId: string) {
  const admin = createServiceRoleClient();
  const cutoff = new Date(Date.now() - ISSUED_STOP_TTL_MS).toISOString();
  await admin
    .from("route_plans")
    .update({ status: "cancelled" })
    .eq("organization_id", organizationId)
    .eq("status", "issued")
    .lt("updated_at", cutoff);
}

export async function cancelRoutePlan(user: SessionUser, planId: string) {
  const admin = createServiceRoleClient();
  const { data: plan } = await admin
    .from("route_plans")
    .select("id, driver_id, status")
    .eq("id", planId)
    .eq("organization_id", user.organization.id)
    .maybeSingle();
  if (!plan) return { ok: false as const, message: "Plan not found." };
  const isManager = user.profile.role === "owner_admin" || user.profile.role === "manager";
  const isAssignedDriver = user.profile.role === "driver" && plan.driver_id === user.authUserId;
  if (!isManager && !isAssignedDriver) {
    return { ok: false as const, message: "You cannot remove this fuel stop." };
  }
  await admin
    .from("route_plans")
    .update({ status: "cancelled" })
    .eq("id", planId)
    .eq("organization_id", user.organization.id);
  return { ok: true as const };
}
