import { IFTA_LIMITATION_NOTE, groupIftaWorksheet } from "@/lib/reports/ifta";
import { parseReportFilters, queryFuelReportRows } from "@/lib/reports/query";
import { groupAvgFuelByTruck } from "@/lib/reports/avg-fuel";
import { isOwnerAdmin } from "@/lib/auth/roles";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ReportFilterForm } from "@/components/management/report-filter-form";
import { formatGallons, formatUsd, cn } from "@/lib/utils";
import { formatPricePerGallon } from "@/lib/receipts/format";
import type { FuelPeriod } from "@/lib/calculations/dates";
import Link from "next/link";

const PERIODS: Array<{ id: FuelPeriod; label: string }> = [
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "year", label: "Yearly" },
];

function reportsHref(params: URLSearchParams, period: FuelPeriod) {
  const next = new URLSearchParams(params);
  next.set("period", period);
  const query = next.toString();
  return query ? `/manage/reports?${query}` : "/manage/reports";
}

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
  const avgFuel = groupAvgFuelByTruck({
    rows: rows.map((row) => ({
      unitNumber: row.unitNumber,
      driverName: row.driverName,
      purchasedAt: row.purchasedAt,
      gallons: row.gallons,
      total: row.total,
    })),
    timezone: user.organization.timezone || "America/Chicago",
    period: filters.period,
  });
  let amended = 0;
  for (const row of receipts) {
    if (row.amended_at) amended += 1;
  }
  const ifta = groupIftaWorksheet(rows);
  const query = url.searchParams.toString();
  const csvHref = query ? `/api/reports/fuel.csv?${query}` : "/api/reports/fuel.csv";
  const iftaHref = query ? `/api/reports/ifta-fuel.csv?${query}` : "/api/reports/ifta-fuel.csv";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Average fuel by truck for each week, month, or year. Driver names are included when a receipt has one."
      />
      <ReportFilterForm filters={filters} trucks={trucks ?? []} drivers={drivers ?? []} />
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="primary">
          <a href={csvHref} download="fueltrail-fuel-report.csv">
            Download truck fuel CSV
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={iftaHref} download="fueltrail-ifta-fuel.csv">
            Download IFTA-ready fuel CSV
          </a>
        </Button>
        {isOwnerAdmin(user.profile.role) ? (
          <Button asChild variant="outline">
            <a href="/api/org/export.json" download="fueltrail-org-export.json">
              Download organization data export
            </a>
          </Button>
        ) : null}
        <Button asChild variant="ghost">
          <Link href="/manage/reports">Clear filters</Link>
        </Button>
      </div>
      {amended > 0 ? (
        <p className="rounded bg-route/15 p-3 text-sm">
          {amended} receipt{amended === 1 ? "" : "s"} in this view {amended === 1 ? "was" : "were"} amended after appearing in a report.
        </p>
      ) : null}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Average fuel by truck</h2>
            <p className="mt-1 text-sm text-muted">
              Gallons, spend, and average price from submitted and verified receipts.
            </p>
          </div>
          <div className="inline-grid grid-cols-3 rounded-full border border-steel/30 bg-warm p-1" role="group" aria-label="Report period">
            {PERIODS.map((period) => (
              <Link
                key={period.id}
                href={reportsHref(url.searchParams, period.id)}
                className={cn(
                  "min-h-11 rounded-full px-4 text-center text-sm font-semibold leading-[2.75rem]",
                  filters.period === period.id ? "bg-route text-white" : "text-muted hover:text-ink",
                )}
                aria-current={filters.period === period.id ? "page" : undefined}
              >
                {period.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-steel/30 text-muted">
                <th className="py-2">Truck</th>
                <th>Period</th>
                <th>Driver</th>
                <th>Gallons</th>
                <th>Avg fill</th>
                <th>Spend</th>
                <th>Avg price</th>
                <th>Receipts</th>
              </tr>
            </thead>
            <tbody>
              {avgFuel.map((row) => (
                <tr key={row.key} className="border-b border-steel/20">
                  <td className="py-2 font-medium">{row.unitNumber}</td>
                  <td>{row.periodLabel}</td>
                  <td>{row.driverNames.join(", ") || "—"}</td>
                  <td className="tabular-nums">{formatGallons(row.gallons)}</td>
                  <td className="tabular-nums">{formatGallons(row.avgFillGallons)}</td>
                  <td className="tabular-nums">{formatUsd(row.spend)}</td>
                  <td className="tabular-nums">{formatPricePerGallon(row.avgPrice)}</td>
                  <td className="tabular-nums">{row.receipts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {avgFuel.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No submitted or verified receipts in this view yet.</p>
        ) : null}
      </Card>
      <Card>
        <h2 className="font-semibold">IFTA-ready fuel purchase worksheet</h2>
        <p className="my-2 rounded bg-route/15 p-3 text-sm">{IFTA_LIMITATION_NOTE}</p>
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
