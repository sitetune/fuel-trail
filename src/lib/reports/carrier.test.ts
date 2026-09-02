import { describe, expect, it } from "vitest";
import { groupByCarrier } from "./carrier";
import type { FuelReportRow } from "./ifta";

function row(merchantName: string, gallons: number, total: number): FuelReportRow {
  return {
    organizationName: "Demo",
    unitNumber: "24",
    vin: null,
    driverName: null,
    purchaserName: null,
    purchasedAt: "2026-08-14T12:00:00Z",
    merchantName,
    merchantAddress: "",
    jurisdiction: "TX",
    gallons,
    fuelType: "diesel",
    pricePerGallon: null,
    total,
    receiptNumber: null,
    verificationStatus: "verified",
    receiptId: merchantName,
  };
}

describe("groupByCarrier", () => {
  it("sums gallons, spend, and receipt count per merchant", () => {
    const grouped = groupByCarrier([
      row("Love's", 100, 400),
      row("Love's", 50, 200),
      row("Pilot", 80, 300),
    ]);
    expect(grouped[0]).toMatchObject({ merchant: "Love's", gallons: 150, spend: 600, receipts: 2 });
    expect(grouped[1]).toMatchObject({ merchant: "Pilot", receipts: 1 });
  });
});
