import { notify } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/domain";

export async function notifyDriverOfFuelStop(input: {
  user: SessionUser;
  planId: string;
  truckUnit: string;
  driverId: string | null;
  originText: string;
  destinationText: string;
  stationName?: string | null;
  gallons?: number | null;
  resend?: boolean;
}) {
  if (!input.driverId) return { notified: false, reason: "No driver is assigned to this truck." };
  const gallons =
    input.gallons != null && Number.isFinite(input.gallons) ? `${Math.round(input.gallons)} gal` : "fuel";
  const station = input.stationName?.trim() || "the recommended stop";
  await notify({
    organizationId: input.user.organization.id,
    recipientIds: [input.driverId],
    eventType: "fuel_stop_issued",
    title: `Fuel stop for unit ${input.truckUnit}`,
    body: `Stop at ${station} and buy about ${gallons} on ${input.originText} → ${input.destinationText}. You make the final safety decision.`,
    href: "/driver",
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
    .select("id, truck_id, driver_id, origin_text, destination_text, recommended_purchase_gallons, recommended_station_id, trucks(unit_number), fuel_stations:recommended_station_id(name)")
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
    originText: plan.origin_text as string,
    destinationText: plan.destination_text as string,
    stationName: (plan.fuel_stations as { name?: string } | null)?.name ?? null,
    gallons: plan.recommended_purchase_gallons == null ? null : Number(plan.recommended_purchase_gallons),
    resend,
  });
  if (!result.notified) return { ok: false as const, message: result.reason ?? "Could not notify the driver." };
  return { ok: true as const };
}
