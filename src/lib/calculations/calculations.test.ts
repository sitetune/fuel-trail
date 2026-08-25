import { describe, expect, it } from "vitest";
import { weightedAveragePrice } from "./price";
import { monthOverMonthChange, explainSpendChange } from "./trends";
import { costPerMile, milesPerGallon, milesBetweenOdometers } from "./efficiency";
import {
  estimateFuel,
  roundUpToIncrement,
  recommendedPurchaseGallons,
  reachableDistanceMiles,
} from "./fuel";
import { effectiveStopCost, savingsVersusAlternative } from "./routing-cost";
import { iftaQuarterRange, monthRangeInTimezone, isoDateInTimezone, startOfWeekSunday, periodKeyInTimezone } from "./dates";
import { duplicateReceiptSignature, sha256Hex } from "./duplicates";

describe("weightedAveragePrice", () => {
  it("weights by gallons", () => {
    expect(
      weightedAveragePrice([
        { spend: 350, gallons: 100 },
        { spend: 400, gallons: 100 },
      ]),
    ).toBe(3.75);
  });
  it("returns null when gallons are zero", () => {
    expect(weightedAveragePrice({ spend: 10, gallons: 0 })).toBeNull();
  });
});

describe("monthOverMonthChange", () => {
  it("computes percent", () => {
    expect(monthOverMonthChange(100, 125)).toEqual({
      previous: 100,
      current: 125,
      absolute: 25,
      percent: 25,
    });
  });
  it("returns null percent when previous is zero", () => {
    expect(monthOverMonthChange(0, 50).percent).toBeNull();
  });
});

describe("explainSpendChange", () => {
  it("does not call a month good or bad from spend alone", () => {
    const result = explainSpendChange({
      currentSpend: 1200,
      previousSpend: 1000,
      currentGallons: 300,
      previousGallons: 250,
      currentAvgPrice: 4,
      previousAvgPrice: 4,
      currentMiles: null,
      previousMiles: null,
    });
    expect(result.summary).toMatch(/Gallons/);
    expect(result.summary).toMatch(/Mileage is unavailable/);
  });
});

describe("efficiency", () => {
  it("returns null cost per mile without miles", () => {
    expect(costPerMile(100, 0)).toBeNull();
    expect(costPerMile(100, null)).toBeNull();
  });
  it("computes mpg", () => {
    expect(milesPerGallon(650, 100)).toBe(6.5);
  });
  it("detects odometer rollback", () => {
    expect(milesBetweenOdometers(1000, 900)).toEqual({ miles: null, rolledBack: true });
  });
});

describe("fuel estimate", () => {
  it("uses full tank as high confidence", () => {
    const result = estimateFuel({
      tankCapacityGallons: 200,
      targetMpg: 6.5,
      purchasedGallons: 80,
      tankLevelAfterMode: "full",
      tankLevelAfterValue: null,
      currentOdometer: 1000,
      previousEstimatedAfterGallons: null,
      previousOdometer: null,
      baselineGallons: null,
      baselineOdometer: null,
    });
    expect(result.estimatedAfterGallons).toBe(200);
    expect(result.confidence).toBe("high");
    expect(result.method).toBe("driver_full");
  });

  it("uses odometer model", () => {
    const result = estimateFuel({
      tankCapacityGallons: 200,
      targetMpg: 6.5,
      purchasedGallons: 50,
      tankLevelAfterMode: "unknown",
      tankLevelAfterValue: null,
      currentOdometer: 1065,
      previousEstimatedAfterGallons: 120,
      previousOdometer: 1000,
      baselineGallons: null,
      baselineOdometer: null,
    });
    expect(result.method).toBe("odometer_model");
    expect(result.estimatedAfterGallons).toBeCloseTo(160, 0);
  });

  it("rounds purchase up to 5 and caps at capacity", () => {
    expect(roundUpToIncrement(111)).toBe(115);
    expect(
      recommendedPurchaseGallons({
        estimatedGallons: 190,
        tankCapacityGallons: 200,
        targetGallons: 220,
      }),
    ).toBe(10);
  });

  it("reachable distance respects reserve", () => {
    expect(reachableDistanceMiles({ estimatedGallons: 100, reserveGallons: 25, targetMpg: 6.5 })).toBe(487.5);
  });
});

describe("routing cost", () => {
  it("adds fuel, detour, time, and drop penalty", () => {
    const cost = effectiveStopCost({
      gallonsToBuy: 100,
      displayedPrice: 3.5,
      detourMiles: 4,
      costPerMile: 1.5,
      detourMinutes: 30,
      driverTimeValueHourly: 20,
      trailerDropPenalty: 25,
      trailerDropRequired: true,
    });
    expect(cost.total).toBe(350 + 6 + 10 + 25);
  });
  it("savings versus alternative", () => {
    expect(savingsVersusAlternative(100, 116.4)).toBeCloseTo(16.4);
    expect(savingsVersusAlternative(100, null)).toBeNull();
  });
});

describe("timezone quarters", () => {
  it("groups August into Q3 in America/Chicago", () => {
    const q = iftaQuarterRange("America/Chicago", new Date("2026-08-18T16:00:00Z"));
    expect(q.label).toBe("2026-Q3");
  });
  it("month range starts on the 1st in org timezone", () => {
    const month = monthRangeInTimezone("America/Chicago", new Date("2026-08-18T16:00:00Z"));
    expect(month.label).toBe("2026-08");
    expect(isoDateInTimezone(month.start, "America/Chicago")).toBe("2026-08-01");
  });
  it("weeks start on Sunday in org timezone", () => {
    const tuesday = new Date("2026-08-18T16:00:00Z");
    expect(isoDateInTimezone(startOfWeekSunday(tuesday, "America/Chicago"), "America/Chicago")).toBe("2026-08-16");
    expect(periodKeyInTimezone(tuesday, "America/Chicago", "week")).toBe("2026-08-16");
    expect(periodKeyInTimezone(tuesday, "America/Chicago", "year")).toBe("2026");
  });
});

describe("duplicate signature", () => {
  const base = {
    organizationId: "org",
    truckId: "truck",
    purchasedAtIsoDate: "2026-08-01",
    merchantName: "Pilot Travel Center #123",
    gallons: 100,
    totalAmount: 349.9,
  };
  it("matches likely duplicates after merchant noise", () => {
    expect(duplicateReceiptSignature(base)).toBe(
      duplicateReceiptSignature({ ...base, merchantName: "PILOT TRAVEL CENTER 123" }),
    );
  });
  it("changes when gallons differ", () => {
    expect(duplicateReceiptSignature(base)).not.toBe(
      duplicateReceiptSignature({ ...base, gallons: 101 }),
    );
  });
});

describe("sha256Hex", () => {
  it("hashes on this thread in Node", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
