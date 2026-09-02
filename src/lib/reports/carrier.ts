import type { FuelReportRow } from "./ifta";

export type CarrierReportRow = {
  merchant: string;
  gallons: number;
  spend: number;
  receipts: number;
};

export function groupByCarrier(rows: FuelReportRow[]): CarrierReportRow[] {
  const map = new Map<string, CarrierReportRow>();
  for (const row of rows) {
    const merchant = row.merchantName?.trim() || "Unknown";
    const current = map.get(merchant) ?? { merchant, gallons: 0, spend: 0, receipts: 0 };
    current.gallons += row.gallons;
    current.spend += row.total;
    current.receipts += 1;
    map.set(merchant, current);
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend || a.merchant.localeCompare(b.merchant));
}
