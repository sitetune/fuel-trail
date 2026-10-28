import { describe, expect, it } from "vitest";
import { percentChange, summarizeFuelSpend } from "./spend-summary";
import type { FuelReportRow } from "./ifta";

function row(total: number, gallons: number): FuelReportRow {
  return {
    organizationName: "Demo",
    unitNumber: "24",
    vin: null,
    driverName: null,
    purchaserName: null,
    purchasedAt: "2026-08-14T12:00:00Z",
    merchantName: "Love's",
    merchantAddress: "",
    jurisdiction: "TX",
    gallons,
    fuelType: "diesel",
    pricePerGallon: null,
    total,
    receiptNumber: null,
    verificationStatus: "verified",
    receiptId: `${total}-${gallons}`,
  };
}

describe("summarizeFuelSpend", () => {
  it("rolls spend, fill-ups, volume, and averages", () => {
    const summary = summarizeFuelSpend([row(400, 100), row(200, 50)]);
    expect(summary).toMatchObject({
      spend: 600,
      gallons: 150,
      fillUps: 2,
      avgFillCost: 300,
      avgPrice: 4,
    });
  });
});

describe("percentChange", () => {
  it("returns null without a previous baseline", () => {
    expect(percentChange(100, 0)).toBeNull();
  });

  it("rounds to one decimal", () => {
    expect(percentChange(110, 100)).toBe(10);
  });
});
