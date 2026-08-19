import Link from "next/link";
import { EstimatedFuelGauge } from "@/components/estimated-fuel-gauge";
import { Badge, Card } from "@/components/ui/card";
import { MetricCard, PageHeader } from "@/components/ui/page-header";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { explainSpendChange, monthRangeInTimezone, previousMonthRangeInTimezone, weightedAveragePrice } from "@/lib/calculations";
import { formatUsd } from "@/lib/utils";

export default async function ManageDashboardPage() {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const current = monthRangeInTimezone(user.organization.timezone);
  const previous = previousMonthRangeInTimezone(user.organization.timezone);
  const { data: trucks } = await supabase
    .from("trucks")
    .select("*")
    .eq("status", "active")
    .order("unit_number");
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number), profiles:driver_id(full_name)")
    .in("status", ["submitted", "verified", "needs_review"]);
  const { data: estimates } = await supabase.from("latest_fuel_estimates").select("*");
  const { data: assignments } = await supabase
    .from("driver_truck_assignments")
    .select("truck_id, profiles:driver_id(full_name)")
    .is("ends_at", null);

  const thisMonth = (receipts ?? []).filter(
    (row) => row.purchased_at && new Date(row.purchased_at) >= current.start && new Date(row.purchased_at) < current.end,
  );
  const lastMonth = (receipts ?? []).filter(
    (row) => row.purchased_at && new Date(row.purchased_at) >= previous.start && new Date(row.purchased_at) < previous.end,
  );
  const spend = thisMonth.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  const gallons = thisMonth.reduce((sum, row) => sum + Number(row.gallons ?? 0), 0);
  const prevSpend = lastMonth.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  const prevGallons = lastMonth.reduce((sum, row) => sum + Number(row.gallons ?? 0), 0);
  const avg = weightedAveragePrice({ spend, gallons });
  const explanation = explainSpendChange({
    currentSpend: spend,
    previousSpend: prevSpend,
    currentGallons: gallons,
    previousGallons: prevGallons,
    currentAvgPrice: avg,
    previousAvgPrice: weightedAveragePrice({ spend: prevSpend, gallons: prevGallons }),
    currentMiles: null,
    previousMiles: null,
  });
  const needsReview = (receipts ?? []).filter((row) => row.status === "needs_review" || row.status === "submitted").length;
  const duplicates = (receipts ?? []).filter((row) => row.duplicate_of && !row.duplicate_override).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Truck-first spend, gallons, and estimated fuel for this month."
        actions={
          <>
            <Link className="text-sm font-medium text-route" href="/manage/setup">
              Launch checklist
            </Link>
            <Link className="text-sm font-medium text-route" href="/manage/import">
              Import
            </Link>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active trucks" value={trucks?.length ?? 0} />
        <MetricCard
          label="Fuel spend"
          value={formatUsd(spend)}
          hint={
            explanation.spendChange.percent == null ? undefined : (
              <span className={explanation.spendChange.percent < 0 ? "text-success" : "text-muted"}>
                {explanation.spendChange.percent}% vs last month
              </span>
            )
          }
        />
        <MetricCard label="Gallons" value={gallons.toFixed(1)} />
        <MetricCard label="Fleet average price" value={avg === null ? "—" : formatUsd(avg)} />
      </div>
      <Card>
        <p className="font-medium">
          Month-over-month spend {explanation.spendChange.percent === null ? "has no prior baseline" : `${explanation.spendChange.percent}%`}.
        </p>
        <p className="mt-1 text-sm text-muted">{explanation.summary}</p>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="alert">{needsReview} receipts needing review</Badge>
        <Badge tone="route">{duplicates} suspected duplicates</Badge>
        <Link className="text-sm font-medium text-route" href="/manage/receipts">
          Open Receipt Center
        </Link>
      </div>
      <div className="grid gap-3 md:hidden">
        {(trucks ?? []).map((truck) => {
          const estimate = estimates?.find((row) => row.truck_id === truck.id);
          const assignment = assignments?.find((row) => row.truck_id === truck.id);
          const monthRows = thisMonth.filter((row) => row.truck_id === truck.id);
          const truckSpend = monthRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
          const truckGallons = monthRows.reduce((sum, row) => sum + Number(row.gallons ?? 0), 0);
          return (
            <Link key={truck.id} href={`/manage/trucks/${truck.id}`}>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xl font-semibold">Unit {truck.unit_number}</p>
                    <p className="text-sm text-muted">
                      {(assignment?.profiles as { full_name?: string } | null)?.full_name ?? "Unassigned"}
                    </p>
                  </div>
                  <p className="font-medium">{formatUsd(truckSpend)}</p>
                </div>
                <div className="mt-3">
                  <EstimatedFuelGauge
                    size="sm"
                    gallons={estimate?.estimated_after_gallons == null ? null : Number(estimate.estimated_after_gallons)}
                    capacity={Number(truck.tank_capacity_gallons)}
                    confidence={estimate?.confidence ?? "unknown"}
                    calculatedAt={estimate?.calculated_at ?? null}
                    reserveGallons={Number(truck.reserve_gallons)}
                    weekStartMinGallons={Number(truck.week_start_min_gallons)}
                  />
                </div>
                <p className="mt-2 text-sm text-muted">{truckGallons.toFixed(1)} gal this month</p>
              </Card>
            </Link>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Fleet trucks with estimated fuel and month spend</caption>
          <thead>
            <tr className="border-b border-steel/30 text-muted">
              <th className="py-2">Unit</th>
              <th>Driver</th>
              <th>Estimated fuel</th>
              <th>Month spend</th>
              <th>Gallons</th>
              <th>Avg price</th>
            </tr>
          </thead>
          <tbody>
            {(trucks ?? []).map((truck) => {
              const estimate = estimates?.find((row) => row.truck_id === truck.id);
              const assignment = assignments?.find((row) => row.truck_id === truck.id);
              const monthRows = thisMonth.filter((row) => row.truck_id === truck.id);
              const truckSpend = monthRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
              const truckGallons = monthRows.reduce((sum, row) => sum + Number(row.gallons ?? 0), 0);
              const truckAvg = weightedAveragePrice({ spend: truckSpend, gallons: truckGallons });
              return (
                <tr key={truck.id} className="border-b border-steel/20">
                  <td className="py-3">
                    <Link className="font-semibold text-route" href={`/manage/trucks/${truck.id}`}>
                      {truck.unit_number}
                    </Link>
                  </td>
                  <td>{(assignment?.profiles as { full_name?: string } | null)?.full_name ?? "Unassigned"}</td>
                  <td>
                    {estimate?.estimated_after_gallons == null
                      ? "Unknown"
                      : `${Number(estimate.estimated_after_gallons).toFixed(0)} gal (${estimate.confidence})`}
                  </td>
                  <td>{formatUsd(truckSpend)}</td>
                  <td>{truckGallons.toFixed(1)}</td>
                  <td>{truckAvg === null ? "—" : formatUsd(truckAvg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
