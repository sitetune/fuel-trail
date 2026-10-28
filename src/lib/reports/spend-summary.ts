import { weightedAveragePrice } from "@/lib/calculations/price";
import type { FuelReportRow } from "@/lib/reports/ifta";

export type FuelSpendSummary = {
  spend: number;
  gallons: number;
  fillUps: number;
  avgFillCost: number | null;
  avgPrice: number | null;
};

export function summarizeFuelSpend(rows: FuelReportRow[]): FuelSpendSummary {
  const spend = rows.reduce((sum, row) => sum + row.total, 0);
  const gallons = rows.reduce((sum, row) => sum + row.gallons, 0);
  const fillUps = rows.length;
  return {
    spend,
    gallons,
    fillUps,
    avgFillCost: fillUps > 0 ? spend / fillUps : null,
    avgPrice: weightedAveragePrice({ spend, gallons }),
  };
}

export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
