import { effectiveStopCost, recommendedPurchaseGallons, reachableDistanceMiles } from "@/lib/calculations";
import type { RankedStopCandidate, RouteStation } from "./types";

export type CandidateRankingInput = {
  stations: Array<
    RouteStation & {
      id: string;
      displayedPrice: number | null;
      priceObservedAt: string | null;
      priceFresh: boolean;
    }
  >;
  estimatedGallons: number;
  tankCapacityGallons: number;
  reserveGallons: number;
  targetMpg: number;
  remainingRouteMiles: number;
  trailerAttached: boolean;
  costPerMile: number | null;
  driverTimeValueHourly: number | null;
  trailerDropPenalty: number | null;
  arrivalReserveGallons: number;
};

export function rankRouteCandidates(input: CandidateRankingInput): RankedStopCandidate[] {
  const pricedExists = input.stations.some((station) => station.displayedPrice !== null && station.priceFresh);
  const candidates: RankedStopCandidate[] = input.stations.map((station) => {
    const assumptions: string[] = [];
    const gallonsRecommended = recommendedPurchaseGallons({
      estimatedGallons: input.estimatedGallons,
      tankCapacityGallons: input.tankCapacityGallons,
      targetGallons: Math.min(
        input.tankCapacityGallons,
        input.estimatedGallons +
          input.remainingRouteMiles / input.targetMpg +
          input.arrivalReserveGallons,
      ),
    });

    let exclusionReason: string | null = null;
    if (station.truckAccess === "no") {
      exclusionReason = "Marked as not truck-accessible.";
    } else if (
      input.trailerAttached &&
      station.trailerPolicy === "drop_required" &&
      !station.dropLocationVerifiedAt &&
      !station.parkingVerifiedAt
    ) {
      exclusionReason =
        "Drop required, but parking/drop location is not manager-verified. Excluded by default for safety.";
    } else if (pricedExists && (station.displayedPrice === null || !station.priceFresh)) {
      exclusionReason = "Price is missing or stale while fresher priced options exist.";
    }

    const reachable = reachableDistanceMiles({
      estimatedGallons: input.estimatedGallons,
      reserveGallons: input.reserveGallons,
      targetMpg: input.targetMpg,
    });
    if (reachable !== null && station.routeMile > reachable) {
      exclusionReason = "Cannot reach this station without breaching the reserve.";
    }

    if (station.displayedPrice === null) {
      assumptions.push("No pump price is stored for this station.");
    }
    if (input.costPerMile === null) {
      assumptions.push("Cost per mile is not configured, so detour mileage is not priced.");
    }
    if (input.driverTimeValueHourly === null) {
      assumptions.push("Driver time value is not configured, so detour time is not priced.");
    }

    const cost =
      station.displayedPrice === null
        ? null
        : effectiveStopCost({
            gallonsToBuy: gallonsRecommended,
            displayedPrice: station.displayedPrice,
            detourMiles: station.detourMiles,
            costPerMile: input.costPerMile,
            detourMinutes: station.detourMinutes,
            driverTimeValueHourly: input.driverTimeValueHourly,
            trailerDropPenalty: input.trailerDropPenalty,
            trailerDropRequired: station.trailerPolicy === "drop_required",
          }).total;

    const trailerDecision =
      station.trailerPolicy === "drop_required"
        ? "drop_required"
        : station.trailerPolicy === "stay_attached"
          ? "stay_attached"
          : "unknown";

    return {
      stationId: station.id,
      name: station.name,
      displayedPrice: station.displayedPrice,
      gallonsRecommended,
      effectiveCost: exclusionReason ? null : cost,
      rank: null,
      excluded: Boolean(exclusionReason),
      exclusionReason,
      explanation: exclusionReason ?? "",
      assumptions,
      truckAccess: station.truckAccess,
      trailerDecision,
      parkingVerified: Boolean(station.parkingVerifiedAt || station.dropLocationVerifiedAt),
      routeMile: station.routeMile,
      detourMiles: station.detourMiles,
      detourMinutes: station.detourMinutes,
    };
  });

  const included = candidates
    .filter((candidate) => !candidate.excluded && candidate.effectiveCost !== null)
    .sort((a, b) => (a.effectiveCost ?? Infinity) - (b.effectiveCost ?? Infinity));

  included.forEach((candidate, index) => {
    candidate.rank = index + 1;
    const next = included[index + 1];
    const savings =
      next?.effectiveCost !== null && next?.effectiveCost !== undefined && candidate.effectiveCost !== null
        ? next.effectiveCost - candidate.effectiveCost
        : null;
    const cents =
      next?.displayedPrice !== null &&
      next?.displayedPrice !== undefined &&
      candidate.displayedPrice !== null
        ? Math.round((next.displayedPrice - candidate.displayedPrice) * 100)
        : null;
    const trailerNote =
      candidate.trailerDecision === "stay_attached"
        ? "Trailer can remain attached."
        : candidate.trailerDecision === "drop_required" && candidate.parkingVerified
          ? "Trailer drop is required at a manager-verified location."
          : "Trailer handling should be confirmed by the driver.";
    candidate.explanation = `Stop at ${candidate.name}. Buy ${candidate.gallonsRecommended} gallons.${
      cents !== null && cents > 0
        ? ` The pump price is ${cents}¢/gal lower than the next truck-accessible option;`
        : ""
    }${
      savings !== null && savings > 0
        ? ` after ${candidate.detourMiles.toFixed(1)} detour miles, estimated net savings are $${savings.toFixed(2)}.`
        : ""
    } ${trailerNote}`.replace(/\s+/g, " ").trim();
  });

  return [...included, ...candidates.filter((candidate) => candidate.excluded || candidate.rank === null)];
}
