import { RoutePlanner } from "@/components/fuel-planning/route-planner";
import { IssuePlanButton } from "@/components/fuel-planning/issue-plan-button";
import { Card } from "@/components/ui/card";
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
  const assignedTruckIds = new Set((assignments ?? []).map((row) => row.truck_id as string));
  const { data: plans } = await supabase
    .from("route_plans")
    .select("*, trucks(unit_number), fuel_stations:recommended_station_id(name)")
    .order("created_at", { ascending: false })
    .limit(10);
  const canIssue = canMutateFleet(user.profile.role);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-2 text-3xl font-semibold">Fuel-stop planner</h1>
        <p className="mb-4 text-sm text-muted">
          Rank stops, then send the recommendation to the driver assigned to that truck. Check the box when you rank, or
          use Send to driver on a saved plan. HERE truck routing is optional when <code>HERE_API_KEY</code> is
          configured. Do not drop a trailer unless parking is manager-verified.
        </p>
        <RoutePlanner trucks={trucks ?? []} assignedTruckIds={[...assignedTruckIds]} />
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold">Recent plans</h2>
        {(plans ?? []).length === 0 ? <Card>No plans yet. Rank a stop to create one.</Card> : null}
        {(plans ?? []).map((plan) => {
          const truckId = plan.truck_id as string;
          const issued = plan.status === "issued";
          return (
            <Card key={plan.id}>
              <p className="font-medium">
                Unit {(plan.trucks as { unit_number: string }).unit_number} · {plan.status}
              </p>
              <p className="text-sm text-muted">
                {plan.origin_text} → {plan.destination_text}
              </p>
              <p className="text-sm">
                {(plan.fuel_stations as { name?: string } | null)?.name ?? "No priced stop ranked"}
                {plan.recommended_purchase_gallons != null ? ` · buy ${plan.recommended_purchase_gallons} gal` : ""}
              </p>
              {canIssue ? (
                <IssuePlanButton
                  planId={plan.id}
                  issued={issued}
                  canIssue={assignedTruckIds.has(truckId) || Boolean(plan.driver_id)}
                />
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
