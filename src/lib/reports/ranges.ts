import {
  isoDateInTimezone,
  monthRangeInTimezone,
  previousMonthRangeInTimezone,
  previousYearRangeInTimezone,
  yearRangeInTimezone,
} from "@/lib/calculations/dates";

export const REPORT_RANGES = ["all", "month", "last_month", "year"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export function parseReportRange(value: string | null | undefined): ReportRange {
  return REPORT_RANGES.includes(value as ReportRange) ? (value as ReportRange) : "all";
}

export function reportRangeBounds(range: ReportRange, timezone: string, at = new Date()) {
  if (range === "all") return null;
  if (range === "month") {
    const current = monthRangeInTimezone(timezone, at);
    return {
      from: isoDateInTimezone(current.start, timezone),
      to: isoDateInTimezone(new Date(current.end.getTime() - 1), timezone),
    };
  }
  if (range === "last_month") {
    const previous = previousMonthRangeInTimezone(timezone, at);
    return {
      from: isoDateInTimezone(previous.start, timezone),
      to: isoDateInTimezone(new Date(previous.end.getTime() - 1), timezone),
    };
  }
  const year = yearRangeInTimezone(timezone, at);
  return {
    from: isoDateInTimezone(year.start, timezone),
    to: isoDateInTimezone(new Date(year.end.getTime() - 1), timezone),
  };
}

export function previousReportRangeBounds(range: ReportRange, timezone: string, at = new Date()) {
  if (range === "all") return null;
  if (range === "month") return reportRangeBounds("last_month", timezone, at);
  if (range === "last_month") {
    const previous = previousMonthRangeInTimezone(timezone, at);
    const before = previousMonthRangeInTimezone(timezone, new Date(previous.start.getTime() - 1));
    return {
      from: isoDateInTimezone(before.start, timezone),
      to: isoDateInTimezone(new Date(before.end.getTime() - 1), timezone),
    };
  }
  const previousYear = previousYearRangeInTimezone(timezone, at);
  return {
    from: isoDateInTimezone(previousYear.start, timezone),
    to: isoDateInTimezone(new Date(previousYear.end.getTime() - 1), timezone),
  };
}
