import { describe, expect, it } from "vitest";
import { haversineMiles } from "./manual";
import { filterStationsWithinRadius, isPriceFresh, observePurchaseSavings } from "./savings";

describe("savings observations", () => {
  it("uses same-station history when nearby quotes are missing", () => {
    const result = observePurchaseSavings({
      receiptId: "r1",
      unitNumber: "101",
      merchantName: "Pilot",
      paidPrice: 3.6,
      gallons: 100,
      orgDayRegionAvg: null,
      nearbyStationPrices: [],
      sameStationRecentPrices: [3.4, 3.5],
    });
    expect(result.comparisonPrice).toBeCloseTo(3.45);
    expect(result.opportunity).toBeCloseTo(15);
    expect(result.explanation).toMatch(/above comparable/i);
  });

  it("treats stale prices as missing", () => {
    expect(isPriceFresh("2026-08-01T00:00:00Z", 72, new Date("2026-08-10T00:00:00Z"))).toBe(false);
    expect(isPriceFresh("2026-08-09T12:00:00Z", 72, new Date("2026-08-10T00:00:00Z"))).toBe(true);
  });

  it("keeps stations inside the comparison radius", () => {
    const stations = filterStationsWithinRadius(
      [
        { id: "a", latitude: 29.76, longitude: -95.37 },
        { id: "b", latitude: 32.78, longitude: -96.8 },
      ],
      { latitude: 29.76, longitude: -95.37 },
      15,
    );
    expect(stations.some((station) => station.id === "a" && (station.miles ?? 0) < 1)).toBe(true);
    expect(stations.some((station) => station.id === "b")).toBe(false);
  });
});

describe("haversine", () => {
  it("measures a short Houston distance", () => {
    expect(haversineMiles(29.76, -95.37, 29.77, -95.37)).toBeLessThan(1);
  });
});
