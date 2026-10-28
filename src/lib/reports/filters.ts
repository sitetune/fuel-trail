import type { FuelPeriod } from "@/lib/calculations/dates";
import { normalizeJurisdiction } from "./jurisdiction";
import { parseReportRange, type ReportRange } from "./ranges";

export type ReportFilters = {
  from?: string | null;
  to?: string | null;
  truckId?: string | null;
  driverId?: string | null;
  merchant?: string | null;
  jurisdiction?: string | null;
  status?: string | null;
  fuelType?: string | null;
  report?: "reported" | "unreported" | null;
  period: FuelPeriod;
  range: ReportRange;
};

export function parseReportFilters(url: URL): ReportFilters {
  const report = url.searchParams.get("report");
  const period = url.searchParams.get("period");
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    truckId: url.searchParams.get("truckId"),
    driverId: url.searchParams.get("driverId"),
    merchant: url.searchParams.get("merchant")?.trim() || null,
    jurisdiction: normalizeJurisdiction(url.searchParams.get("jurisdiction") ?? url.searchParams.get("region")),
    status: url.searchParams.get("status"),
    fuelType: url.searchParams.get("fuelType"),
    report: report === "reported" || report === "unreported" ? report : null,
    period: period === "week" || period === "year" ? period : "month",
    range: parseReportRange(url.searchParams.get("range")),
  };
}

export function reportFiltersAreActive(filters: ReportFilters) {
  return Boolean(
    filters.from ||
      filters.to ||
      filters.truckId ||
      filters.driverId ||
      filters.merchant ||
      filters.jurisdiction ||
      filters.status ||
      filters.fuelType ||
      filters.report ||
      (filters.range && filters.range !== "all"),
  );
}
