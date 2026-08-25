import { describe, expect, it } from "vitest";
import { parseReportFilters, reportFiltersAreActive } from "./filters";

describe("parseReportFilters", () => {
  it("defaults to monthly and treats empty query as inactive", () => {
    const filters = parseReportFilters(new URL("https://fueltrail.local/manage/reports"));
    expect(filters.period).toBe("month");
    expect(reportFiltersAreActive(filters)).toBe(false);
  });

  it("reads weekly period and a date range", () => {
    const filters = parseReportFilters(
      new URL("https://fueltrail.local/manage/reports?period=week&from=2026-08-01&to=2026-08-31"),
    );
    expect(filters.period).toBe("week");
    expect(filters.from).toBe("2026-08-01");
    expect(reportFiltersAreActive(filters)).toBe(true);
  });
});
