/** Organization-timezone date helpers. Never assume the server is in America/Chicago. */

function dateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Convert a wall-clock datetime in `timezone` to a UTC Date.
 * Uses the standard offset-probe so DST is respected.
 */
export function fromZonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const zoned = dateParts(new Date(utcGuess), timezone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return new Date(utcGuess + (utcGuess - zonedAsUtc));
}

export function isoDateInTimezone(value: Date, timezone: string): string {
  const { year, month, day } = dateParts(value, timezone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function monthKeyInTimezone(value: Date, timezone: string): string {
  const { year, month } = dateParts(value, timezone);
  return `${year}-${pad(month)}`;
}

export function monthRangeInTimezone(timezone: string, at = new Date()) {
  const { year, month } = dateParts(at, timezone);
  const start = fromZonedDateTime(year, month, 1, 0, 0, 0, timezone);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = fromZonedDateTime(nextYear, nextMonth, 1, 0, 0, 0, timezone);
  return { start, end, label: `${year}-${pad(month)}`, year, month };
}

export function previousMonthRangeInTimezone(timezone: string, at = new Date()) {
  const current = monthRangeInTimezone(timezone, at);
  return monthRangeInTimezone(timezone, new Date(current.start.getTime() - 1));
}

export function iftaQuarterRange(timezone: string, at = new Date()) {
  const { year, month } = dateParts(at, timezone);
  const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
  const startMonth = (quarter - 1) * 3 + 1;
  const start = fromZonedDateTime(year, startMonth, 1, 0, 0, 0, timezone);
  const endMonth = startMonth + 3;
  const end =
    endMonth > 12
      ? fromZonedDateTime(year + 1, endMonth - 12, 1, 0, 0, 0, timezone)
      : fromZonedDateTime(year, endMonth, 1, 0, 0, 0, timezone);
  return {
    quarter,
    year,
    start,
    end,
    label: `${year}-Q${quarter}`,
  };
}

export function previousIftaQuarter(timezone: string, at = new Date()) {
  const current = iftaQuarterRange(timezone, at);
  return iftaQuarterRange(timezone, new Date(current.start.getTime() - 1));
}

export function hoursBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60);
}

const WEEKDAYS_SUN0 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type FuelPeriod = "week" | "month" | "year";

export function weekdaySun0InTimezone(value: Date, timezone: string): number {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(value);
  const index = WEEKDAYS_SUN0.indexOf(label as (typeof WEEKDAYS_SUN0)[number]);
  return index === -1 ? 0 : index;
}

/** Sunday 00:00 in the organization timezone. */
export function startOfWeekSunday(value: Date, timezone: string): Date {
  const { year, month, day } = dateParts(value, timezone);
  const noon = fromZonedDateTime(year, month, day, 12, 0, 0, timezone);
  const dow = weekdaySun0InTimezone(noon, timezone);
  return fromZonedDateTime(year, month, day - dow, 0, 0, 0, timezone);
}

export function periodKeyInTimezone(value: Date, timezone: string, period: FuelPeriod): string {
  if (period === "year") return String(dateParts(value, timezone).year);
  if (period === "month") return monthKeyInTimezone(value, timezone);
  return isoDateInTimezone(startOfWeekSunday(value, timezone), timezone);
}

export function periodLabelInTimezone(key: string, period: FuelPeriod, timezone: string): string {
  if (period === "year") return key;
  if (period === "month") {
    const [year, month] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: timezone }).format(
      fromZonedDateTime(year, month, 1, 12, 0, 0, timezone),
    );
  }
  const [year, month, day] = key.split("-").map(Number);
  const start = fromZonedDateTime(year, month, day, 12, 0, 0, timezone);
  const end = fromZonedDateTime(year, month, day + 6, 12, 0, 0, timezone);
  const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: timezone });
  const yearFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: timezone });
  return `${dayFmt.format(start)}–${dayFmt.format(end)}, ${yearFmt.format(end)}`;
}

/** Inclusive calendar dates in org timezone → UTC bounds for timestamp filters. */
export function inclusiveDateRangeIso(from: string, to: string | null, timezone: string) {
  const [startYear, startMonth, startDay] = from.split("-").map(Number);
  const start = fromZonedDateTime(startYear, startMonth, startDay, 0, 0, 0, timezone);
  if (!to) return { startIso: start.toISOString(), endExclusiveIso: null as string | null };
  const [endYear, endMonth, endDay] = to.split("-").map(Number);
  const end = fromZonedDateTime(endYear, endMonth, endDay + 1, 0, 0, 0, timezone);
  return { startIso: start.toISOString(), endExclusiveIso: end.toISOString() };
}
