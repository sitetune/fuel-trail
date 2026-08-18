import { roundTo } from "./math";

export type EffectiveStopCostInput = {
  gallonsToBuy: number;
  displayedPrice: number;
  detourMiles: number;
  costPerMile: number | null;
  detourMinutes: number;
  driverTimeValueHourly: number | null;
  trailerDropPenalty: number | null;
  trailerDropRequired: boolean;
};

export type EffectiveStopCost = {
  fuelCost: number;
  detourCost: number;
  timeCost: number;
  dropPenalty: number;
  total: number;
};

export function effectiveStopCost(input: EffectiveStopCostInput): EffectiveStopCost {
  const fuelCost = roundTo(input.gallonsToBuy * input.displayedPrice, 2);
  const detourCost =
    input.costPerMile === null ? 0 : roundTo(input.detourMiles * input.costPerMile, 2);
  const timeCost =
    input.driverTimeValueHourly === null
      ? 0
      : roundTo((input.detourMinutes / 60) * input.driverTimeValueHourly, 2);
  const dropPenalty = input.trailerDropRequired ? (input.trailerDropPenalty ?? 0) : 0;
  return {
    fuelCost,
    detourCost,
    timeCost,
    dropPenalty,
    total: roundTo(fuelCost + detourCost + timeCost + dropPenalty, 2),
  };
}

export function savingsVersusAlternative(
  candidateTotal: number,
  alternativeTotal: number | null,
): number | null {
  if (alternativeTotal === null) return null;
  return roundTo(alternativeTotal - candidateTotal, 2);
}
