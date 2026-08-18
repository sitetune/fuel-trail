import { getServerEnv } from "@/lib/env";
import { HereFuelRouteProvider } from "./here";
import { ManualFuelRouteProvider } from "./manual";
import type { FuelPriceInput, FuelPriceQuote, FuelRouteProvider, RouteStation, StationSearchInput } from "./types";

export function getFuelRouteProvider(deps: {
  getStationsAlongManualRoute: (input: StationSearchInput) => Promise<RouteStation[]>;
  getPrices: (input: FuelPriceInput) => Promise<FuelPriceQuote[]>;
}): FuelRouteProvider {
  const env = getServerEnv();
  if (env.FUEL_ROUTE_PROVIDER === "here") {
    if (!env.HERE_API_KEY) {
      return new ManualFuelRouteProvider(deps);
    }
    return new HereFuelRouteProvider(env.HERE_API_KEY, deps.getStationsAlongManualRoute);
  }
  return new ManualFuelRouteProvider(deps);
}

export { rankRouteCandidates } from "./rank";
export { haversineMiles } from "./manual";
export type { FuelRouteProvider, RankedStopCandidate } from "./types";
