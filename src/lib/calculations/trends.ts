import { roundTo } from "./math";

export type MonthOverMonthChange = {
  previous: number;
  current: number;
  absolute: number;
  percent: number | null;
};

/**
 * Absolute and percentage month-over-month change.
 * Percent is null when the previous period is zero so UI can say "no prior baseline".
 */
export function monthOverMonthChange(previous: number, current: number): MonthOverMonthChange {
  const absolute = roundTo(current - previous, 2);
  if (!Number.isFinite(previous) || previous === 0) {
    return { previous, current, absolute, percent: null };
  }
  return {
    previous,
    current,
    absolute,
    percent: roundTo((absolute / previous) * 100, 1),
  };
}

export type SpendChangeExplanation = {
  spendChange: MonthOverMonthChange;
  gallonsChange: MonthOverMonthChange;
  priceChange: MonthOverMonthChange;
  milesChange: MonthOverMonthChange | null;
  summary: string;
};

export function explainSpendChange(input: {
  currentSpend: number;
  previousSpend: number;
  currentGallons: number;
  previousGallons: number;
  currentAvgPrice: number | null;
  previousAvgPrice: number | null;
  currentMiles: number | null;
  previousMiles: number | null;
}): SpendChangeExplanation {
  const spendChange = monthOverMonthChange(input.previousSpend, input.currentSpend);
  const gallonsChange = monthOverMonthChange(input.previousGallons, input.currentGallons);
  const priceChange = monthOverMonthChange(
    input.previousAvgPrice ?? 0,
    input.currentAvgPrice ?? 0,
  );
  const milesChange =
    input.currentMiles === null || input.previousMiles === null
      ? null
      : monthOverMonthChange(input.previousMiles, input.currentMiles);

  const drivers: string[] = [];
  if (input.previousSpend === 0 && input.currentSpend === 0) {
    drivers.push("No fuel spend in either month.");
  } else if (input.previousSpend === 0) {
    drivers.push("No prior-month spend to compare against.");
  } else {
    if (Math.abs(gallonsChange.percent ?? 0) >= 1) {
      drivers.push(
        `Gallons ${gallonsChange.absolute >= 0 ? "increased" : "decreased"} by ${Math.abs(gallonsChange.percent ?? 0)}%.`,
      );
    }
    if (input.currentAvgPrice !== null && input.previousAvgPrice !== null) {
      const priceMom = monthOverMonthChange(input.previousAvgPrice, input.currentAvgPrice);
      if (priceMom.percent !== null && Math.abs(priceMom.percent) >= 1) {
        drivers.push(
          `Average price ${priceMom.absolute >= 0 ? "rose" : "fell"} by ${Math.abs(priceMom.percent)}%.`,
        );
      }
    } else {
      drivers.push("Average price comparison is incomplete.");
    }
    if (milesChange === null) {
      drivers.push("Mileage is unavailable, so cost-per-mile cannot explain the change.");
    } else if (milesChange.percent !== null && Math.abs(milesChange.percent) >= 1) {
      drivers.push(
        `Miles ${milesChange.absolute >= 0 ? "increased" : "decreased"} by ${Math.abs(milesChange.percent)}%.`,
      );
    }
  }

  return {
    spendChange,
    gallonsChange,
    priceChange,
    milesChange,
    summary: drivers.join(" "),
  };
}
