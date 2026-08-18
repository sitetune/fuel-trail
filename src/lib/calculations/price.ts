import { roundTo } from "./math";

export type WeightedPriceInput = {
  spend: number;
  gallons: number;
};

/**
 * Weighted average price = total spend / total gallons.
 * Returns null when gallons are missing or not positive so callers never render 0/NaN.
 */
export function weightedAveragePrice(
  inputs: WeightedPriceInput[] | { spend: number; gallons: number },
): number | null {
  const rows = Array.isArray(inputs) ? inputs : [inputs];
  const spend = rows.reduce((sum, row) => sum + row.spend, 0);
  const gallons = rows.reduce((sum, row) => sum + row.gallons, 0);
  if (!Number.isFinite(spend) || !Number.isFinite(gallons) || gallons <= 0) {
    return null;
  }
  return roundTo(spend / gallons, 4);
}
