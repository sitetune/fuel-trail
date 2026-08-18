import type { EstimateConfidence, EstimateMethod, TankLevelMode } from "@/types/domain";
import { milesBetweenOdometers } from "./efficiency";
import { clamp, roundTo } from "./math";

export type FuelEstimateInput = {
  tankCapacityGallons: number;
  targetMpg: number;
  purchasedGallons: number;
  tankLevelAfterMode: TankLevelMode;
  tankLevelAfterValue: number | null;
  currentOdometer: number | null;
  previousEstimatedAfterGallons: number | null;
  previousOdometer: number | null;
  baselineGallons: number | null;
  baselineOdometer: number | null;
};

export type FuelEstimateResult = {
  estimatedBeforeGallons: number | null;
  purchasedGallons: number;
  estimatedAfterGallons: number | null;
  odometer: number | null;
  confidence: EstimateConfidence;
  method: EstimateMethod;
  reasons: string[];
  calculation: Record<string, unknown>;
};

export function estimateFuel(input: FuelEstimateInput): FuelEstimateResult {
  const capacity = input.tankCapacityGallons;
  const purchased = input.purchasedGallons;
  const reasons: string[] = [];

  if (input.tankLevelAfterMode === "full") {
    return {
      estimatedBeforeGallons: clamp(capacity - purchased, 0, capacity),
      purchasedGallons: purchased,
      estimatedAfterGallons: capacity,
      odometer: input.currentOdometer,
      confidence: "high",
      method: "driver_full",
      reasons: ["Driver reported the tank was full after fueling."],
      calculation: { capacity, purchased, after: capacity },
    };
  }

  if (input.tankLevelAfterMode === "gallons" && input.tankLevelAfterValue !== null) {
    const after = clamp(input.tankLevelAfterValue, 0, capacity);
    return {
      estimatedBeforeGallons: clamp(after - purchased, 0, capacity),
      purchasedGallons: purchased,
      estimatedAfterGallons: after,
      odometer: input.currentOdometer,
      confidence: "high",
      method: "driver_gallons",
      reasons: ["Driver entered gallons remaining after fueling."],
      calculation: { capacity, purchased, after },
    };
  }

  if (input.tankLevelAfterMode === "percent" && input.tankLevelAfterValue !== null) {
    const after = clamp(capacity * (input.tankLevelAfterValue / 100), 0, capacity);
    return {
      estimatedBeforeGallons: clamp(after - purchased, 0, capacity),
      purchasedGallons: purchased,
      estimatedAfterGallons: roundTo(after, 2),
      odometer: input.currentOdometer,
      confidence: "medium",
      method: "driver_percent",
      reasons: ["Driver selected a tank percentage after fueling."],
      calculation: {
        capacity,
        percent: input.tankLevelAfterValue,
        after,
      },
    };
  }

  const odo = milesBetweenOdometers(input.previousOdometer, input.currentOdometer);
  if (
    input.previousEstimatedAfterGallons !== null &&
    odo.miles !== null &&
    input.targetMpg > 0
  ) {
    const estimatedUsed = odo.miles / input.targetMpg;
    const estimatedBefore = clamp(
      input.previousEstimatedAfterGallons - estimatedUsed,
      0,
      capacity,
    );
    const estimatedAfter = clamp(estimatedBefore + purchased, 0, capacity);
    const confidence: EstimateConfidence = odo.miles > 800 ? "low" : "medium";
    return {
      estimatedBeforeGallons: roundTo(estimatedBefore, 2),
      purchasedGallons: purchased,
      estimatedAfterGallons: roundTo(estimatedAfter, 2),
      odometer: input.currentOdometer,
      confidence,
      method: "odometer_model",
      reasons: [
        "Estimated from previous fill, odometer miles, and target MPG.",
        confidence === "low" ? "Odometer gap is large, so confidence is lowered." : "",
      ].filter(Boolean),
      calculation: {
        milesSincePrevious: odo.miles,
        estimatedUsed,
        previousAfter: input.previousEstimatedAfterGallons,
        estimatedBefore,
        estimatedAfter,
        targetMpg: input.targetMpg,
      },
    };
  }

  if (odo.rolledBack) {
    reasons.push("Odometer rolled backward; odometer model was not used.");
  } else if (input.currentOdometer === null) {
    reasons.push("Odometer is missing.");
  }

  if (input.baselineGallons !== null) {
    const milesFromBaseline = milesBetweenOdometers(
      input.baselineOdometer,
      input.currentOdometer,
    );
    let after = input.baselineGallons + purchased;
    if (milesFromBaseline.miles !== null && input.targetMpg > 0) {
      after = input.baselineGallons - milesFromBaseline.miles / input.targetMpg + purchased;
    }
    const estimatedAfter = clamp(after, 0, capacity);
    return {
      estimatedBeforeGallons: clamp(estimatedAfter - purchased, 0, capacity),
      purchasedGallons: purchased,
      estimatedAfterGallons: roundTo(estimatedAfter, 2),
      odometer: input.currentOdometer,
      confidence: "medium",
      method: "baseline",
      reasons: ["Estimated from the manager-entered baseline.", ...reasons],
      calculation: {
        baselineGallons: input.baselineGallons,
        baselineOdometer: input.baselineOdometer,
        purchased,
        estimatedAfter,
      },
    };
  }

  return {
    estimatedBeforeGallons: null,
    purchasedGallons: purchased,
    estimatedAfterGallons: null,
    odometer: input.currentOdometer,
    confidence: "unknown",
    method: "unknown",
    reasons: ["Not enough data to estimate fuel.", ...reasons],
    calculation: { purchased },
  };
}

export function roundUpToIncrement(gallons: number, increment = 5): number {
  if (gallons <= 0) return 0;
  return Math.ceil(gallons / increment) * increment;
}

export function recommendedPurchaseGallons(input: {
  estimatedGallons: number;
  tankCapacityGallons: number;
  targetGallons: number;
  increment?: number;
}): number {
  const available = Math.max(0, input.tankCapacityGallons - input.estimatedGallons);
  const needed = Math.max(0, input.targetGallons - input.estimatedGallons);
  const rounded = roundUpToIncrement(needed, input.increment);
  return Math.min(available, rounded);
}

export function reachableDistanceMiles(input: {
  estimatedGallons: number;
  reserveGallons: number;
  targetMpg: number;
}): number | null {
  if (input.targetMpg <= 0) return null;
  const usable = input.estimatedGallons - input.reserveGallons;
  if (usable <= 0) return 0;
  return roundTo(usable * input.targetMpg, 1);
}

export function gallonsNeededToReserve(input: {
  estimatedGallons: number;
  reserveGallons: number;
  remainingMiles: number;
  targetMpg: number;
  tankCapacityGallons: number;
}): number {
  const burn = input.remainingMiles / input.targetMpg;
  const needed = burn + input.reserveGallons - input.estimatedGallons;
  return recommendedPurchaseGallons({
    estimatedGallons: input.estimatedGallons,
    tankCapacityGallons: input.tankCapacityGallons,
    targetGallons: input.estimatedGallons + Math.max(0, needed),
  });
}
