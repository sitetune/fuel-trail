import Link from "next/link";
import { redirect } from "next/navigation";
import { EstimatedFuelGauge } from "@/components/estimated-fuel-gauge";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { QueueStatus } from "@/components/driver/queue-status";

export default async function DriverHomePage() {
  const user = await requireSession();
  if (user.profile.role !== "driver") redirect("/manage");
  const supabase = await createServerSupabaseClient();
  const { data: assignment } = await supabase
    .from("driver_truck_assignments")
    .select("*, trucks(*)")
    .eq("driver_id", user.authUserId)
    .is("ends_at", null)
    .maybeSingle();
  const truck = assignment?.trucks as {
    id: string;
    unit_number: string;
    tank_capacity_gallons: number;
    reserve_gallons: number;
    week_start_min_gallons: number;
  } | null;
  const { data: estimate } = truck
    ? await supabase.from("latest_fuel_estimates").select("*").eq("truck_id", truck.id).maybeSingle()
    : { data: null };
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("id, status, gallons, purchased_at, merchant_name")
    .eq("driver_id", user.authUserId)
    .order("created_at", { ascending: false })
    .limit(3);
  const { data: plan } = truck
    ? await supabase
        .from("route_plans")
        .select("*, fuel_stations:recommended_station_id(name)")
        .eq("truck_id", truck.id)
        .eq("status", "issued")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-[#5E6B75]">Assigned truck</p>
        <p className="text-3xl font-semibold">{truck?.unit_number ?? "Unassigned"}</p>
        {!truck ? (
          <p className="mt-2 text-sm text-[#C93C37]">Ask a manager to assign you to a truck.</p>
        ) : null}
      </Card>
      {truck ? (
        <Card>
          <EstimatedFuelGauge
            gallons={estimate?.estimated_after_gallons === null || estimate?.estimated_after_gallons === undefined ? null : Number(estimate.estimated_after_gallons)}
            capacity={Number(truck.tank_capacity_gallons)}
            confidence={estimate?.confidence ?? "unknown"}
            calculatedAt={estimate?.calculated_at ?? null}
            reserveGallons={Number(truck.reserve_gallons)}
            weekStartMinGallons={Number(truck.week_start_min_gallons)}
          />
        </Card>
      ) : null}
      {plan ? (
        <Card>
          <p className="text-sm font-semibold">Manager fuel-stop recommendation</p>
          <p className="mt-1 text-lg">
            {(plan.fuel_stations as { name?: string } | null)?.name ?? "See issued plan"} — buy{" "}
            {plan.recommended_purchase_gallons ?? "—"} gal
          </p>
          <p className="text-sm text-[#5E6B75]">You make the final safety decision.</p>
        </Card>
      ) : null}
      <Button asChild variant="amber" size="lg" className="w-full text-lg">
        <Link href="/driver/receipts/new">Scan fuel receipt</Link>
      </Button>
      <QueueStatus userId={user.authUserId} />
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#5E6B75]">Latest receipts</h2>
        <div className="space-y-2">
          {(receipts ?? []).length === 0 ? (
            <Card>No receipts yet.</Card>
          ) : (
            receipts?.map((receipt) => (
              <Card key={receipt.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{receipt.merchant_name ?? "Draft"}</p>
                  <p className="text-sm text-[#5E6B75]">
                    {receipt.gallons ? `${receipt.gallons} gal` : "In progress"}
                  </p>
                </div>
                <Badge tone={receipt.status === "verified" ? "success" : receipt.status === "rejected" ? "alert" : "amber"}>
                  {receipt.status.replace("_", " ")}
                </Badge>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
