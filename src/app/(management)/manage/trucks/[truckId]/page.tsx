import { notFound } from "next/navigation";
import { EstimatedFuelGauge } from "@/components/estimated-fuel-gauge";
import { TruckForm } from "@/components/management/truck-form";
import { TruckCharts } from "@/components/management/truck-charts";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { assignDriverAction, setBaselineAction } from "../../actions";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/utils";

export default async function TruckDetailPage({ params }: { params: Promise<{ truckId: string }> }) {
  await requireManagement();
  const { truckId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: truck } = await supabase.from("trucks").select("*").eq("id", truckId).single();
  if (!truck) notFound();
  const { data: estimate } = await supabase.from("latest_fuel_estimates").select("*").eq("truck_id", truckId).maybeSingle();
  const { data: assignment } = await supabase
    .from("driver_truck_assignments")
    .select("*, profiles:driver_id(full_name, email)")
    .eq("truck_id", truckId)
    .is("ends_at", null)
    .maybeSingle();
  const { data: history } = await supabase
    .from("driver_truck_assignments")
    .select("*, profiles:driver_id(full_name)")
    .eq("truck_id", truckId)
    .order("starts_at", { ascending: false });
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("*")
    .eq("truck_id", truckId)
    .order("purchased_at", { ascending: false })
    .limit(20);
  const { data: drivers } = await supabase.from("profiles").select("id, full_name").eq("role", "driver").eq("is_active", true);
  const { data: metrics } = await supabase
    .from("monthly_truck_fuel_metrics")
    .select("*")
    .eq("truck_id", truckId)
    .order("month_start");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Unit {truck.unit_number}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <EstimatedFuelGauge
            size="lg"
            gallons={estimate?.estimated_after_gallons == null ? null : Number(estimate.estimated_after_gallons)}
            capacity={Number(truck.tank_capacity_gallons)}
            confidence={estimate?.confidence ?? "unknown"}
            calculatedAt={estimate?.calculated_at ?? null}
            reserveGallons={Number(truck.reserve_gallons)}
            weekStartMinGallons={Number(truck.week_start_min_gallons)}
          />
        </Card>
        <Card>
          <p className="font-semibold">Current assignment</p>
          <p className="mt-1">
            {(assignment?.profiles as { full_name?: string } | null)?.full_name ?? "Unassigned"}
          </p>
          <form action={assignDriverAction} className="mt-3 space-y-2">
            <input type="hidden" name="truckId" value={truck.id} />
            <Label htmlFor="driverId">Assign driver</Label>
            <select id="driverId" name="driverId" className="h-11 w-full rounded-md border px-3" required>
              {(drivers ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                </option>
              ))}
            </select>
            <Button type="submit">Save assignment</Button>
          </form>
        </Card>
      </div>
      <TruckCharts
        points={(metrics ?? []).map((row) => ({
          month: String(row.month_start).slice(0, 7),
          spend: Number(row.spend),
          gallons: Number(row.gallons),
          avgPrice: row.avg_price === null ? null : Number(row.avg_price),
        }))}
      />
      <Card>
        <h2 className="font-semibold">Receipt history</h2>
        <ul className="mt-2 space-y-2">
          {(receipts ?? []).map((receipt) => (
            <li key={receipt.id} className="flex items-center justify-between gap-2">
              <span>
                {receipt.merchant_name} · {receipt.gallons} gal · {formatUsd(Number(receipt.total_amount ?? 0))}
              </span>
              <Badge>{receipt.status}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold">Baseline correction</h2>
        <form action={setBaselineAction} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="truckId" value={truck.id} />
          <Input name="baseline_fuel_gallons" type="number" step="0.1" placeholder="Gallons now" required />
          <Input name="baseline_odometer" type="number" step="0.1" placeholder="Odometer" />
          <Button type="submit">Save baseline</Button>
        </form>
      </Card>
      <TruckForm truck={truck} />
      <Card>
        <h2 className="font-semibold">Assignment history</h2>
        <ul className="mt-2 text-sm">
          {(history ?? []).map((row) => (
            <li key={row.id}>
              {(row.profiles as { full_name?: string } | null)?.full_name} · {new Date(row.starts_at).toLocaleDateString()}
              {row.ends_at ? ` – ${new Date(row.ends_at).toLocaleDateString()}` : " – current"}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
