import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { assertPlanAllows, PlanLimitError } from "@/lib/billing/assert";
import { groupAvgFuelByTruck } from "@/lib/reports/avg-fuel";
import { toCsv } from "@/lib/reports/csv";
import { parseReportFilters, queryFuelReportRows, snapshotReportRun } from "@/lib/reports/query";

export async function GET(request: Request) {
  try {
    const user = await requireManagement();
    assertPlanAllows(user.organization, "reports");
    const url = new URL(request.url);
    const filters = parseReportFilters(url);
    const { receipts, rows } = await queryFuelReportRows(user, filters);
    await snapshotReportRun({
      user,
      reportType: "avg_fuel_csv",
      filters,
      receipts: receipts as Array<Record<string, unknown>>,
    });
    const csv = toCsv(
      ["truck", "period", "driver", "gallons", "avg_fill", "spend", "avg_price", "receipts"],
      groupAvgFuelByTruck({
        rows: rows.map((row) => ({
          unitNumber: row.unitNumber,
          driverName: row.driverName,
          purchasedAt: row.purchasedAt,
          gallons: row.gallons,
          total: row.total,
        })),
        timezone: user.organization.timezone || "America/Chicago",
        period: filters.period,
      }).map((row) => [
        row.unitNumber,
        row.periodLabel,
        row.driverNames.join(", "),
        row.gallons,
        row.avgFillGallons,
        row.spend,
        row.avgPrice,
        row.receipts,
      ]),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fueltrail-avg-fuel-by-truck.csv"',
      },
    });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return apiError(403, error.code, error.message);
    }
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "report_failed", "Could not export average fuel by truck.");
  }
}
