"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireManagement, requireOwner } from "@/lib/auth/session";

export async function upsertTruckAction(formData: FormData) {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id") || "");
  const payload = {
    organization_id: user.organization.id,
    unit_number: String(formData.get("unit_number")),
    vin: String(formData.get("vin") || "") || null,
    license_plate: String(formData.get("license_plate") || "") || null,
    tank_capacity_gallons: Number(formData.get("tank_capacity_gallons")),
    target_mpg: Number(formData.get("target_mpg")),
    week_start_min_gallons: Number(formData.get("week_start_min_gallons")),
    reserve_gallons: Number(formData.get("reserve_gallons")),
    status: String(formData.get("status") || "active"),
  };
  if (id) {
    await supabase.from("trucks").update(payload).eq("id", id);
    await supabase.from("app_audit_events").insert({
      organization_id: user.organization.id,
      actor_id: user.authUserId,
      entity_type: "truck",
      entity_id: id,
      event_type: "truck_updated",
    });
    redirect(`/manage/trucks/${id}`);
  }
  const { data } = await supabase.from("trucks").insert(payload).select("id").single();
  redirect(`/manage/trucks/${data?.id}`);
}

export async function assignDriverAction(formData: FormData) {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const truckId = String(formData.get("truckId"));
  const driverId = String(formData.get("driverId"));
  await supabase
    .from("driver_truck_assignments")
    .update({ ends_at: new Date().toISOString() })
    .eq("truck_id", truckId)
    .is("ends_at", null);
  await supabase
    .from("driver_truck_assignments")
    .update({ ends_at: new Date().toISOString() })
    .eq("driver_id", driverId)
    .is("ends_at", null);
  await supabase.from("driver_truck_assignments").insert({
    organization_id: user.organization.id,
    truck_id: truckId,
    driver_id: driverId,
    created_by: user.authUserId,
  });
  redirect(`/manage/trucks/${truckId}`);
}

export async function setBaselineAction(formData: FormData) {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const truckId = String(formData.get("truckId"));
  const gallons = Number(formData.get("baseline_fuel_gallons"));
  const odometer = formData.get("baseline_odometer") ? Number(formData.get("baseline_odometer")) : null;
  await supabase
    .from("trucks")
    .update({
      baseline_fuel_gallons: gallons,
      baseline_odometer: odometer,
      baseline_recorded_at: new Date().toISOString(),
    })
    .eq("id", truckId);
  await supabase.from("fuel_level_estimates").insert({
    organization_id: user.organization.id,
    truck_id: truckId,
    estimated_after_gallons: gallons,
    odometer,
    confidence: "medium",
    method: "baseline",
    calculation_json: { actor: user.authUserId },
  });
  await supabase.from("app_audit_events").insert({
    organization_id: user.organization.id,
    actor_id: user.authUserId,
    entity_type: "truck",
    entity_id: truckId,
    event_type: "baseline_corrected",
    metadata: { gallons, odometer },
  });
  redirect(`/manage/trucks/${truckId}`);
}

export async function updateOrgSettingsAction(formData: FormData) {
  const user = await requireOwner();
  const supabase = await createServerSupabaseClient();
  const retention = Number(formData.get("retention_years"));
  if (retention < 4) {
    redirect("/manage/settings?error=retention");
  }
  await supabase
    .from("organizations")
    .update({
      name: String(formData.get("name")),
      base_jurisdiction: String(formData.get("base_jurisdiction") || "") || null,
      timezone: String(formData.get("timezone")),
      default_tank_capacity_gallons: Number(formData.get("default_tank_capacity_gallons")),
      default_target_mpg: Number(formData.get("default_target_mpg")),
      default_week_start_min_gallons: Number(formData.get("default_week_start_min_gallons")),
      default_reserve_gallons: Number(formData.get("default_reserve_gallons")),
      default_cost_per_mile: formData.get("default_cost_per_mile")
        ? Number(formData.get("default_cost_per_mile"))
        : null,
      default_driver_time_value_hourly: formData.get("default_driver_time_value_hourly")
        ? Number(formData.get("default_driver_time_value_hourly"))
        : null,
      retention_years: retention,
    })
    .eq("id", user.organization.id);
  redirect("/manage/settings?saved=1");
}

export async function toggleUserActiveAction(formData: FormData) {
  await requireOwner();
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const next = String(formData.get("is_active")) === "true";
  if (!next) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "owner_admin")
      .eq("is_active", true)
      .neq("id", id);
    if ((count ?? 0) === 0) {
      redirect("/manage/users?error=last-owner");
    }
  }
  await supabase.from("profiles").update({ is_active: next }).eq("id", id);
  redirect("/manage/users");
}
