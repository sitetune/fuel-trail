import { roundTo } from "./math";

export function costPerMile(spend: number, miles: number | null | undefined): number | null {
  if (!Number.isFinite(spend) || miles === null || miles === undefined || miles <= 0) {
    return null;
  }
  return roundTo(spend / miles, 3);
}

export function milesPerGallon(miles: number | null | undefined, gallons: number): number | null {
  if (miles === null || miles === undefined || miles <= 0 || gallons <= 0) {
    return null;
  }
  return roundTo(miles / gallons, 2);
}

export function milesBetweenOdometers(
  previous: number | null | undefined,
  current: number | null | undefined,
): { miles: number | null; rolledBack: boolean } {
  if (previous === null || previous === undefined || current === null || current === undefined) {
    return { miles: null, rolledBack: false };
  }
  if (current < previous) {
    return { miles: null, rolledBack: true };
  }
  return { miles: roundTo(current - previous, 1), rolledBack: false };
}
