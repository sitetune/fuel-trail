import { weightedAveragePrice } from "@/lib/calculations";

export type SavingsObservation = {
  receiptId: string;
  unitNumber: string;
  merchantName: string;
  paidPrice: number;
  comparisonPrice: number | null;
  gallons: number;
  opportunity: number | null;
  explanation: string;
};

export function observePurchaseSavings(input: {
  receiptId: string;
  unitNumber: string;
  merchantName: string;
  paidPrice: number;
  gallons: number;
  orgDayRegionAvg: number | null;
  nearbyStationPrices: number[];
  sameStationRecentPrices: number[];
}): SavingsObservation {
  const comparables: number[] = [];
  if (input.orgDayRegionAvg !== null) comparables.push(input.orgDayRegionAvg);
  comparables.push(...input.nearbyStationPrices);
  if (comparables.length === 0 && input.sameStationRecentPrices.length === 0) {
    return {
      receiptId: input.receiptId,
      unitNumber: input.unitNumber,
      merchantName: input.merchantName,
      paidPrice: input.paidPrice,
      comparisonPrice: null,
      gallons: input.gallons,
      opportunity: null,
      explanation: "Not enough comparison data",
    };
  }
  const comparisonPrice =
    weightedAveragePrice(
      comparables.length
        ? comparables.map((price) => ({ spend: price, gallons: 1 }))
        : input.sameStationRecentPrices.map((price) => ({ spend: price, gallons: 1 })),
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
      explanation: "Not enough comparison data",
    };
  }
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
    explanation:
      delta > 0.01
        ? `Paid ${delta.toFixed(3)}/gal above comparable stations. About $${opportunity.toFixed(2)} more than available alternatives.`
        : "Paid at or below comparable known prices.",
  };
}
