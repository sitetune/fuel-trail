import { describe, expect, it } from "vitest";
import { rankRouteCandidates } from "./rank";
import type { RouteStation } from "./types";

function station(
  partial: Partial<RouteStation> & {
    id: string;
    name: string;
    displayedPrice?: number | null;
    priceObservedAt?: string | null;
    priceFresh?: boolean;
  },
): RouteStation & {
  id: string;
  displayedPrice: number | null;
  priceObservedAt: string | null;
  priceFresh: boolean;
} {
  return {
    address: "1",
    city: "Baytown",
    region: "TX",
    postalCode: "77521",
    latitude: 29.7,
    longitude: -94.9,
    truckAccess: "yes",
    parkingAvailable: "yes",
    parkingVerifiedAt: "2026-01-01",
    trailerPolicy: "stay_attached",
    dropLocationVerifiedAt: null,
    routeMile: 10,
    detourMiles: 2,
    detourMinutes: 6,
    displayedPrice: 3.4,
    priceObservedAt: "2026-08-01T00:00:00Z",
    priceFresh: true,
    ...partial,
  };
}

describe("route candidate ranking", () => {
  const baseInput = {
    estimatedGallons: 80,
    tankCapacityGallons: 200,
    reserveGallons: 25,
    targetMpg: 6.5,
    remainingRouteMiles: 40,
    trailerAttached: true,
    costPerMile: 1.5,
    driverTimeValueHourly: 25,
    trailerDropPenalty: 40,
    arrivalReserveGallons: 25,
  };

  it("excludes car-only stations", () => {
    const ranked = rankRouteCandidates({
      ...baseInput,
      stations: [
        station({ id: "car", name: "Car only", truckAccess: "no" }),
        station({ id: "truck", name: "Truck stop", displayedPrice: 3.5 }),
      ],
    });
    expect(ranked.find((row) => row.stationId === "car")?.excluded).toBe(true);
    expect(ranked.find((row) => row.stationId === "truck")?.rank).toBe(1);
  });

  it("excludes unverified trailer-drop stops by default", () => {
    const ranked = rankRouteCandidates({
      ...baseInput,
      stations: [
        station({
          id: "drop",
          name: "Drop yard",
          trailerPolicy: "drop_required",
          parkingVerifiedAt: null,
          dropLocationVerifiedAt: null,
        }),
      ],
    });
    expect(ranked[0].excluded).toBe(true);
    expect(ranked[0].exclusionReason).toMatch(/not manager-verified/);
  });
});
