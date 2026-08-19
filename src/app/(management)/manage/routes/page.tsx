import { RoutePlanner } from "@/components/fuel-planning/route-planner";
import { Card } from "@/components/ui/card";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function RoutesPage() {
  await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: trucks } = await supabase.from("trucks").select("id, unit_number").eq("status", "active");
  const { data: plans } = await supabase
    .from("route_plans")
    .select("*, trucks(unit_number)")
    .order("created_at", { ascending: false })
    .limit(10);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-2 text-3xl font-semibold">Fuel-stop planner</h1>
        <p className="mb-4 text-sm text-muted">
          Manual mode is fully usable with imported or manager-entered prices. HERE truck routing is
          optional when <code>HERE_API_KEY</code> is configured. Do not drop a trailer unless parking
          is manager-verified.
        </p>
        <RoutePlanner trucks={trucks ?? []} />
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold">Recent plans</h2>
        {(plans ?? []).map((plan) => (
          <Card key={plan.id}>
            <p className="font-medium">
              Unit {(plan.trucks as { unit_number: string }).unit_number} · {plan.status}
            </p>
            <p className="text-sm text-muted">
              {plan.origin_text} → {plan.destination_text}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
