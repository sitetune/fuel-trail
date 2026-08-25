import { FuelStopsWorkspace } from "@/components/fuel-planning/fuel-stops-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { canMutateFleet } from "@/lib/auth/roles";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function RoutesPage() {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: trucks } = await supabase.from("trucks").select("id, unit_number").eq("status", "active");
  const { data: assignments } = await supabase
    .from("driver_truck_assignments")
    .select("truck_id, driver_id")
    .is("ends_at", null);
  const assignedTruckIds = (assignments ?? []).map((row) => row.truck_id as string);
  const { data: plans } = await supabase
    .from("route_plans")
    .select("id, truck_id, driver_id, status, origin_text, destination_text, recommended_purchase_gallons, trucks(unit_number), fuel_stations:recommended_station_id(name)")
    .order("created_at", { ascending: false })
    .limit(10);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuel stops"
        description="Search a city or click the map to find truck stops and fuel stations from OpenStreetMap. Live GasBuddy prices are not available without a licensed feed; we overlay prices from your imports when a stop matches."
      />
      <FuelStopsWorkspace
        trucks={trucks ?? []}
        assignedTruckIds={assignedTruckIds}
        canIssue={canMutateFleet(user.profile.role)}
        plans={(plans ?? []).map((plan) => ({
          id: plan.id as string,
          truck_id: plan.truck_id as string,
          status: plan.status as string,
          origin_text: plan.origin_text as string,
          destination_text: plan.destination_text as string,
          recommended_purchase_gallons: plan.recommended_purchase_gallons as number | string | null,
          driver_id: (plan.driver_id as string | null) ?? null,
          trucks: Array.isArray(plan.trucks) ? (plan.trucks[0] as { unit_number: string } | undefined) ?? null : ((plan.trucks as { unit_number: string } | null) ?? null),
          fuel_stations: Array.isArray(plan.fuel_stations)
            ? ((plan.fuel_stations[0] as { name?: string } | undefined) ?? null)
            : ((plan.fuel_stations as { name?: string } | null) ?? null),
        }))}
      />
    </div>
  );
}
