import { weightedAveragePrice } from "@/lib/calculations";
import { haversineMiles } from "@/lib/routing/manual";

export type SavingsObservation = {
  receiptId: string;
  unitNumber: string;
  merchantName: string;
  paidPrice: number;
  comparisonPrice: number | null;
  gallons: number;
  opportunity: number | null;
  confidence: "high" | "medium" | "low" | "none";
  explanation: string;
  assumptions: string[];
  trailerNotes: string[];
};

export type NearbyStationPrice = {
  name: string;
  price: number;
  observedAt: string | null;
  miles: number | null;
  trailerPolicy: string | null;
};

export function isPriceFresh(observedAt: string | null | undefined, freshnessHours: number, now = new Date()) {
  if (!observedAt) return false;
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) return false;
  return now.getTime() - observed.getTime() <= freshnessHours * 60 * 60 * 1000;
}

export function filterStationsWithinRadius<T extends { latitude: number | null; longitude: number | null }>(
  stations: T[],
  origin: { latitude: number | null; longitude: number | null },
  radiusMiles: number,
): Array<T & { miles: number | null }> {
  if (origin.latitude == null || origin.longitude == null) {
    return stations.map((station) => ({ ...station, miles: null }));
  }
  return stations
    .map((station) => ({
      ...station,
      miles:
        station.latitude == null || station.longitude == null
          ? null
          : haversineMiles(origin.latitude!, origin.longitude!, station.latitude, station.longitude),
    }))
    .filter((station) => station.miles == null || station.miles <= radiusMiles);
}

export function observePurchaseSavings(input: {
  receiptId: string;
  unitNumber: string;
  merchantName: string;
  paidPrice: number;
  gallons: number;
  orgDayRegionAvg: number | null;
  nearbyStationPrices: number[];
  sameStationRecentPrices: number[];
  nearbyStations?: NearbyStationPrice[];
  radiusMiles?: number;
  freshnessHours?: number;
  now?: Date;
}): SavingsObservation {
  const assumptions: string[] = [
    "Savings are estimated from stored receipts and manager-supplied prices. They are not guaranteed.",
  ];
  const trailerNotes: string[] = [];
  const freshnessHours = input.freshnessHours ?? 72;
  const radiusMiles = input.radiusMiles ?? 15;
  assumptions.push(`Comparison radius is ${radiusMiles} miles.`);
  assumptions.push(`Prices older than ${freshnessHours} hours are treated as stale.`);

  const nearby = (input.nearbyStations ?? []).filter((station) =>
    isPriceFresh(station.observedAt, freshnessHours, input.now),
  );
  const nearbyPrices =
    nearby.length > 0 ? nearby.map((station) => station.price) : input.nearbyStationPrices.filter((price) => price > 0);

  if (nearby.some((station) => station.trailerPolicy === "drop_required")) {
    trailerNotes.push("A cheaper nearby option may require dropping the trailer. Confirm parking before diverting.");
  }
  if (nearby.some((station) => station.miles != null && station.miles > radiusMiles * 0.8)) {
    trailerNotes.push("Some comparison stations sit near the edge of the search radius.");
  }

  const comparables: number[] = [];
  if (input.orgDayRegionAvg !== null) comparables.push(input.orgDayRegionAvg);
  comparables.push(...nearbyPrices);

  const sameStation = input.sameStationRecentPrices.filter((price) => Number.isFinite(price) && price > 0);
  if (sameStation.length) {
    assumptions.push("Same-station recent purchase prices were included when nearby quotes were thin.");
  }

  if (comparables.length === 0 && sameStation.length === 0) {
    return {
      receiptId: input.receiptId,
      unitNumber: input.unitNumber,
      merchantName: input.merchantName,
      paidPrice: input.paidPrice,
      comparisonPrice: null,
      gallons: input.gallons,
      opportunity: null,
      confidence: "none",
      explanation: "Not enough fresh comparison data within the configured radius.",
      assumptions,
      trailerNotes,
    };
  }

  const comparisonPrice = weightedAveragePrice(
    (comparables.length ? comparables : sameStation).map((price) => ({ spend: price, gallons: 1 })),
  );
  if (comparisonPrice === null) {
    return {
      receiptId: input.receiptId,
      unitNumber: input.unitNumber,
      merchantName: input.merchantName,
      paidPrice: input.paidPrice,
      comparisonPrice: null,
      gallons: input.gallons,
      opportunity: null,
      confidence: "none",
      explanation: "Not enough comparison data",
      assumptions,
      trailerNotes,
    };
  }

  const sourceCount = comparables.length || sameStation.length;
  const confidence: SavingsObservation["confidence"] =
    nearby.length >= 3 ? "high" : nearby.length >= 1 || sourceCount >= 3 ? "medium" : "low";
  const delta = input.paidPrice - comparisonPrice;
  const opportunity = delta > 0 ? delta * input.gallons : 0;
  return {
    receiptId: input.receiptId,
    unitNumber: input.unitNumber,
    merchantName: input.merchantName,
    paidPrice: input.paidPrice,
    comparisonPrice,
    gallons: input.gallons,
    opportunity,
    confidence,
    explanation:
      delta > 0.01
        ? `Paid ${delta.toFixed(3)}/gal above comparable stations. About $${opportunity.toFixed(2)} more than available alternatives.`
        : "Paid at or below comparable known prices.",
    assumptions,
    trailerNotes,
  };
}
