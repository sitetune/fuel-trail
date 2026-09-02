import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { assertPlanAllows, PlanLimitError } from "@/lib/billing/assert";
import { fuelPurchasesCsv } from "@/lib/reports/ifta";
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
      reportType: "fuel_csv",
      filters,
      receipts: receipts as Array<Record<string, unknown>>,
    });
    const csv = fuelPurchasesCsv(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fueltrail-fuel-report.csv"',
      },
    });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return apiError(403, error.code, error.message);
    }
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "report_failed", "Could not export report.");
  }
}
