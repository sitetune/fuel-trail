import { periodKeyInTimezone, periodLabelInTimezone, type FuelPeriod } from "@/lib/calculations/dates";
import { weightedAveragePrice } from "@/lib/calculations/price";

export type AvgFuelInputRow = {
  unitNumber: string;
  driverName: string | null;
  purchasedAt: string;
  gallons: number;
  total: number;
};

export type AvgFuelRow = {
  key: string;
  unitNumber: string;
  periodKey: string;
  periodLabel: string;
  driverNames: string[];
  gallons: number;
  spend: number;
  avgPrice: number | null;
  avgFillGallons: number | null;
  receipts: number;
};

export function groupAvgFuelByTruck(input: {
  rows: AvgFuelInputRow[];
  timezone: string;
  period: FuelPeriod;
}): AvgFuelRow[] {
  const groups = new Map<
    string,
    { unitNumber: string; periodKey: string; gallons: number; spend: number; receipts: number; drivers: Set<string> }
  >();
  for (const row of input.rows) {
    const purchased = new Date(row.purchasedAt);
    if (Number.isNaN(purchased.getTime())) continue;
    const periodKey = periodKeyInTimezone(purchased, input.timezone, input.period);
    const unitNumber = row.unitNumber || "Unknown";
    const key = `${unitNumber}|${periodKey}`;
    const current = groups.get(key) ?? {
      unitNumber,
      periodKey,
      gallons: 0,
      spend: 0,
      receipts: 0,
      drivers: new Set<string>(),
    };
    current.gallons += row.gallons;
    current.spend += row.total;
    current.receipts += 1;
    if (row.driverName) current.drivers.add(row.driverName);
    groups.set(key, current);
  }
  return [...groups.values()]
    .map((group) => ({
      key: `${group.unitNumber}|${group.periodKey}`,
      unitNumber: group.unitNumber,
      periodKey: group.periodKey,
      periodLabel: periodLabelInTimezone(group.periodKey, input.period, input.timezone),
      driverNames: [...group.drivers].sort(),
      gallons: group.gallons,
      spend: group.spend,
      avgPrice: weightedAveragePrice({ spend: group.spend, gallons: group.gallons }),
      avgFillGallons: group.receipts > 0 ? group.gallons / group.receipts : null,
      receipts: group.receipts,
    }))
    .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber) || b.periodKey.localeCompare(a.periodKey));
}
