import { describe, expect, it } from "vitest";
import { derivePricePerGallon, validateReceiptMath } from "./receipt";

describe("receipt validation", () => {
  const base = {
    truckId: "11111111-1111-4111-8111-111111111111",
    purchasedAt: "2026-08-18T12:00:00Z",
    merchantName: "Pilot",
    merchantAddress: "1 I-10",
    merchantCity: "Baytown",
    merchantRegion: "TX" as const,
    purchaserName: "Driver",
    fuelType: "diesel",
    gallons: 100,
    pricePerGallon: 3.5,
    totalAmount: 350,
    tankLevelAfterMode: "unknown" as const,
    tankCapacityGallons: 200,
  };

  it("derives price when missing", () => {
    const derived = derivePricePerGallon({ gallons: 100, totalAmount: 349.9 });
    expect(derived.derived).toBe(true);
    expect(derived.pricePerGallon).toBeCloseTo(3.499, 3);
  });

  it("warns on gallons x price mismatch", () => {
    const warnings = validateReceiptMath(
      { ...base, pricePerGallon: 3.5, totalAmount: 500 },
      { now: new Date("2026-08-18T13:00:00Z") },
    );
    expect(warnings.some((warning) => warning.code === "math_mismatch")).toBe(true);
  });

  it("warns over tank capacity instead of rejecting", () => {
    const warnings = validateReceiptMath(
      { ...base, gallons: 250, totalAmount: 875, pricePerGallon: 3.5 },
      { now: new Date("2026-08-18T13:00:00Z") },
    );
    expect(warnings.some((warning) => warning.code === "over_capacity")).toBe(true);
  });

  it("flags late submissions and future dates", () => {
    const late = validateReceiptMath(base, { now: new Date("2026-08-20T13:00:00Z") });
    expect(late.some((warning) => warning.code === "late_submission")).toBe(true);
    const future = validateReceiptMath(
      { ...base, purchasedAt: "2026-08-19T12:00:00Z" },
      { now: new Date("2026-08-18T12:00:00Z") },
    );
    expect(future.some((warning) => warning.code === "future_date")).toBe(true);
  });
});
