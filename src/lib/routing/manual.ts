import type { FuelPriceInput, FuelPriceQuote, FuelRouteProvider, StationSearchInput, TruckRoute, TruckRouteInput } from "./types";

/**
 * Manual provider: no commercial API. Managers supply origin/destination miles
 * and candidate stations from the organization database / CSV import.
 */
export class ManualFuelRouteProvider implements FuelRouteProvider {
  constructor(
    private readonly deps: {
      getStationsAlongManualRoute: (input: StationSearchInput) => Promise<import("./types").RouteStation[]>;
      getPrices: (input: FuelPriceInput) => Promise<FuelPriceQuote[]>;
    },
  ) {}

  async getTruckRoute(input: TruckRouteInput): Promise<TruckRoute> {
    if (
      input.originLat == null ||
      input.originLng == null ||
      input.destinationLat == null ||
      input.destinationLng == null
    ) {
      throw new Error("Manual routing requires origin and destination coordinates or a saved station pair.");
    }
    const distanceMiles = haversineMiles(
      input.originLat,
      input.originLng,
      input.destinationLat,
      input.destinationLng,
    );
    return {
      distanceMiles,
      durationMinutes: Math.round((distanceMiles / 50) * 60),
      geometry: {
        type: "LineString",
        coordinates: [
          [input.originLng, input.originLat],
          [input.destinationLng, input.destinationLat],
        ],
      },
      originLat: input.originLat,
      originLng: input.originLng,
      destinationLat: input.destinationLat,
      destinationLng: input.destinationLng,
      provider: "manual",
      notices: [
        "Straight-line estimate only. Import a route distance or connect HERE for truck-legal routing.",
      ],
    };
  }

  async findStationsAlongRoute(input: StationSearchInput) {
    return this.deps.getStationsAlongManualRoute(input);
  }

  async getFuelPrices(input: FuelPriceInput) {
    return this.deps.getPrices(input);
  }
}

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
