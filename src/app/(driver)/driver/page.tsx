import Link from "next/link";
import { redirect } from "next/navigation";
import { FileDashed } from "@phosphor-icons/react/ssr";
import { EstimatedFuelGauge } from "@/components/estimated-fuel-gauge";
import { FuelStopAssignment } from "@/components/driver/fuel-stop-assignment";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { DRIVER_FUEL_STOP_SELECT, resolveDriverFuelStop } from "@/lib/routing/driver-stop";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { QueueStatus } from "@/components/driver/queue-status";
import { formatUsd } from "@/lib/utils";

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
    .select("id, status, gallons, purchased_at, merchant_name, total_amount")
    .eq("driver_id", user.authUserId)
    .order("created_at", { ascending: false })
    .limit(3);
  const { data: plan } = truck
    ? await supabase
        .from("route_plans")
        .select(DRIVER_FUEL_STOP_SELECT)
        .eq("truck_id", truck.id)
        .eq("status", "issued")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const assignedStop = plan
    ? resolveDriverFuelStop(plan as import("@/lib/routing/driver-stop").DriverFuelStopPlan)
    : null;

  return (
    <div className="space-y-4">
      {assignedStop ? <FuelStopAssignment stop={assignedStop} variant="banner" /> : null}
      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-route/10 text-route">
            <FileDashed size={28} />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Capture receipt</h1>
            <p className="text-sm text-muted">
              {truck ? `Truck ${truck.unit_number}` : "No truck assigned yet"}
            </p>
          </div>
        </div>
        {!truck ? (
          <p className="text-sm font-medium text-alert">Ask a manager to assign you to a truck.</p>
        ) : null}
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href="/driver/receipts/new">Add receipt</Link>
        </Button>
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
      <QueueStatus userId={user.authUserId} />
      <section>
        <h2 className="mb-2 font-display text-base font-semibold tracking-tight">Recent stops</h2>
        <div className="space-y-2">
          {(receipts ?? []).length === 0 ? (
            <Card className="text-sm text-muted">No receipts yet. Add one after you fuel.</Card>
          ) : (
            receipts?.map((receipt) => (
              <Link key={receipt.id} href={`/driver/receipts/${receipt.id}`} className="block">
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{receipt.merchant_name ?? "Draft"}</p>
                    <p className="text-sm text-muted">
                      {receipt.purchased_at
                        ? new Date(receipt.purchased_at).toLocaleDateString()
                        : "In progress"}
                      {receipt.gallons ? ` · ${receipt.gallons} gal` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base font-semibold tabular-nums">
                      {receipt.total_amount != null ? formatUsd(Number(receipt.total_amount)) : ""}
                    </p>
                    <Badge tone={receipt.status === "verified" ? "success" : receipt.status === "rejected" ? "alert" : "route"}>
                      {receipt.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
