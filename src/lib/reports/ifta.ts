import { csvEscape, toCsv } from "./csv";

export const IFTA_LIMITATION_NOTE =
  "Fuel purchase worksheet only. A complete IFTA return also requires distance traveled in each jurisdiction.";

export type FuelReportRow = {
  organizationName: string;
  unitNumber: string;
  vin: string | null;
  driverName: string | null;
  purchaserName: string | null;
  purchasedAt: string;
  merchantName: string;
  merchantAddress: string;
  jurisdiction: string;
  gallons: number;
  fuelType: string;
  pricePerGallon: number | null;
  total: number;
  receiptNumber: string | null;
  verificationStatus: string;
  receiptId: string;
};

export function fuelPurchasesCsv(rows: FuelReportRow[]): string {
  return toCsv(
    [
      "organization_name",
      "unit_number",
      "vin",
      "driver",
      "purchaser",
      "purchased_at",
      "seller_name",
      "seller_address",
      "jurisdiction",
      "gallons",
      "fuel_type",
      "price_per_gallon",
      "total",
      "receipt_number",
      "verification_status",
      "receipt_id",
    ],
    rows.map((row) => [
      row.organizationName,
      row.unitNumber,
      row.vin,
      row.driverName,
      row.purchaserName,
      row.purchasedAt,
      row.merchantName,
      row.merchantAddress,
      row.jurisdiction,
      row.gallons,
      row.fuelType,
      row.pricePerGallon,
      row.total,
      row.receiptNumber,
      row.verificationStatus,
      row.receiptId,
    ]),
  );
}

export function iftaFuelCsv(rows: FuelReportRow[]): string {
  const body = fuelPurchasesCsv(rows);
  return `${csvEscape(IFTA_LIMITATION_NOTE)}\r\n${body}`;
}

export function groupIftaWorksheet(rows: FuelReportRow[]) {
  const groups = new Map<
    string,
    { quarter: string; unitNumber: string; jurisdiction: string; fuelType: string; gallons: number; total: number; tax: number; count: number }
  >();
  for (const row of rows) {
    const quarter = quarterLabel(row.purchasedAt);
    const key = `${quarter}|${row.unitNumber}|${row.jurisdiction}|${row.fuelType}`;
    const current = groups.get(key) ?? {
      quarter,
      unitNumber: row.unitNumber,
      jurisdiction: row.jurisdiction,
      fuelType: row.fuelType,
      gallons: 0,
      total: 0,
      tax: 0,
      count: 0,
    };
    current.gallons += row.gallons;
    current.total += row.total;
    current.count += 1;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => a.quarter.localeCompare(b.quarter) || a.unitNumber.localeCompare(b.unitNumber));
}

function quarterLabel(iso: string): string {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}
