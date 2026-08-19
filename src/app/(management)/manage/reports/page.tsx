import { IFTA_LIMITATION_NOTE, groupIftaWorksheet } from "@/lib/reports/ifta";
import { parseReportFilters, queryFuelReportRows } from "@/lib/reports/query";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { weightedAveragePrice } from "@/lib/calculations";
import { formatUsd } from "@/lib/utils";
import Link from "next/link";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireManagement();
  const raw = await searchParams;
  const url = new URL("https://fueltrail.local/manage/reports");
  for (const [key, value] of Object.entries(raw)) {
    const text = Array.isArray(value) ? value[0] : value;
    if (text) url.searchParams.set(key, text);
  }
  const filters = parseReportFilters(url);
  const { receipts, rows } = await queryFuelReportRows(user, filters);
  const supabase = await createServerSupabaseClient();
  const [{ data: trucks }, { data: drivers }, { data: runs }] = await Promise.all([
    supabase.from("trucks").select("id, unit_number").order("unit_number"),
    supabase.from("profiles").select("id, full_name").eq("role", "driver").order("full_name"),
    supabase.from("report_runs").select("id, report_type, receipt_count, created_at, filters").order("created_at", { ascending: false }).limit(10),
  ]);
  const byTruck = new Map<string, { gallons: number; spend: number; count: number; verified: number }>();
  let amended = 0;
  for (const row of receipts) {
    const unit = (row.trucks as { unit_number: string } | null)?.unit_number ?? "Unknown";
    const current = byTruck.get(unit) ?? { gallons: 0, spend: 0, count: 0, verified: 0 };
    current.gallons += Number(row.gallons ?? 0);
    current.spend += Number(row.total_amount ?? 0);
    current.count += 1;
    if (row.status === "verified") current.verified += 1;
    if (row.amended_at) amended += 1;
    byTruck.set(unit, current);
  }
  const ifta = groupIftaWorksheet(rows);
  const query = url.searchParams.toString();
  const csvHref = query ? `/api/reports/fuel.csv?${query}` : "/api/reports/fuel.csv";
  const iftaHref = query ? `/api/reports/ifta-fuel.csv?${query}` : "/api/reports/ifta-fuel.csv";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Reports</h1>
      <Card>
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" type="date" defaultValue={filters.from ?? ""} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" defaultValue={filters.to ?? ""} />
          </div>
          <div>
            <Label htmlFor="truckId">Truck</Label>
            <select id="truckId" name="truckId" className="h-11 w-full rounded-md border px-3" defaultValue={filters.truckId ?? ""}>
              <option value="">All trucks</option>
              {(trucks ?? []).map((truck) => (
                <option key={truck.id} value={truck.id}>
                  Unit {truck.unit_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="driverId">Driver</Label>
            <select id="driverId" name="driverId" className="h-11 w-full rounded-md border px-3" defaultValue={filters.driverId ?? ""}>
              <option value="">All drivers</option>
              {(drivers ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="merchant">Merchant</Label>
            <Input id="merchant" name="merchant" defaultValue={filters.merchant ?? ""} />
          </div>
          <div>
            <Label htmlFor="jurisdiction">State</Label>
            <Input id="jurisdiction" name="jurisdiction" defaultValue={filters.jurisdiction ?? ""} maxLength={2} />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" className="h-11 w-full rounded-md border px-3" defaultValue={filters.status ?? ""}>
              <option value="">Submitted + verified</option>
              <option value="verified">verified</option>
              <option value="submitted">submitted</option>
            </select>
          </div>
          <div>
            <Label htmlFor="report">Report membership</Label>
            <select id="report" name="report" className="h-11 w-full rounded-md border px-3" defaultValue={filters.report ?? ""}>
              <option value="">All</option>
              <option value="unreported">Unreported</option>
              <option value="reported">Already reported</option>
            </select>
          </div>
          <div>
            <Label htmlFor="fuelType">Fuel type</Label>
            <Input id="fuelType" name="fuelType" defaultValue={filters.fuelType ?? ""} placeholder="diesel" />
          </div>
          <div className="flex items-end">
            <Button type="submit">Apply filters</Button>
          </div>
        </form>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="amber">
          <a href={csvHref}>Download truck fuel CSV</a>
        </Button>
        <Button asChild variant="outline">
          <a href={iftaHref}>Download IFTA-ready fuel CSV</a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/manage/reports">Clear filters</Link>
        </Button>
      </div>
      {amended > 0 ? (
        <p className="rounded bg-[#F5A524]/20 p-3 text-sm">
          {amended} receipt{amended === 1 ? "" : "s"} in this view {amended === 1 ? "was" : "were"} amended after appearing in a report.
        </p>
      ) : null}
      <Card>
        <h2 className="font-semibold">Truck fuel report</h2>
        <p className="mb-3 text-sm text-[#5E6B75]">CSV export snapshots the current filter so later edits do not silently rewrite history.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Truck</th>
                <th>Gallons</th>
                <th>Spend</th>
                <th>Avg price</th>
                <th>Receipts</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {[...byTruck.entries()].map(([unit, stats]) => (
                <tr key={unit} className="border-b">
                  <td className="py-2">{unit}</td>
                  <td>{stats.gallons.toFixed(1)}</td>
                  <td>{formatUsd(stats.spend)}</td>
                  <td>
                    {weightedAveragePrice({ spend: stats.spend, gallons: stats.gallons }) === null
                      ? "—"
                      : formatUsd(weightedAveragePrice({ spend: stats.spend, gallons: stats.gallons }) ?? 0)}
                  </td>
                  <td>{stats.count}</td>
                  <td>{stats.verified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">IFTA-ready fuel purchase worksheet</h2>
        <p className="my-2 rounded bg-[#F5A524]/20 p-3 text-sm">{IFTA_LIMITATION_NOTE}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Quarter</th>
                <th>Truck</th>
                <th>Jurisdiction</th>
                <th>Fuel</th>
                <th>Gallons</th>
                <th>Total</th>
                <th>Receipts</th>
              </tr>
            </thead>
            <tbody>
              {ifta.map((row) => (
                <tr key={`${row.quarter}-${row.unitNumber}-${row.jurisdiction}`} className="border-b">
                  <td className="py-2">{row.quarter}</td>
                  <td>{row.unitNumber}</td>
                  <td>{row.jurisdiction}</td>
                  <td>{row.fuelType}</td>
                  <td>{row.gallons.toFixed(1)}</td>
                  <td>{formatUsd(row.total)}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Report history</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {(runs ?? []).length === 0 ? <li>No CSV snapshots yet. Download a report to create one.</li> : null}
          {(runs ?? []).map((run) => (
            <li key={run.id}>
              {run.report_type} · {run.receipt_count} receipts · {new Date(run.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
