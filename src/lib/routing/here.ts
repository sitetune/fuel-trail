import { haversineMiles } from "./manual";
import type {
  FuelPriceInput,
  FuelPriceQuote,
  FuelRouteProvider,
  RouteStation,
  StationSearchInput,
  TruckRoute,
  TruckRouteInput,
} from "./types";

const ROUTING_URL = "https://router.hereapi.com/v8/routes";
const GEOCODE_URL = "https://geocode.search.hereapi.com/v1/geocode";
const FUEL_URL = "https://fuel.hereapi.com/v3/stations";

/**
 * HERE adapter. Truck routing uses Routing API v8 (`transportMode=truck`).
 * Fuel Prices is a separate product at fuel.hereapi.com and may 403 if the
 * account lacks that SKU — routing and manual prices still work.
 */
export class HereFuelRouteProvider implements FuelRouteProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fallbackStations?: (input: StationSearchInput) => Promise<RouteStation[]>,
  ) {}

  async getTruckRoute(input: TruckRouteInput): Promise<TruckRoute> {
    const origin = await this.resolvePoint(input.originText, input.originLat, input.originLng);
    const destination = await this.resolvePoint(
      input.destinationText,
      input.destinationLat,
      input.destinationLng,
    );
    const params = new URLSearchParams({
      transportMode: "truck",
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      return: "polyline,summary",
      routingMode: "fast",
      apiKey: this.apiKey,
    });
    const response = await fetch(`${ROUTING_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error("HERE truck routing is unavailable. Use manual coordinates or check HERE_API_KEY access.");
    }
    const json = (await response.json()) as {
      routes?: Array<{
        sections?: Array<{
          summary?: { duration?: number; length?: number };
          polyline?: string;
        }>;
      }>;
    };
    const section = json.routes?.[0]?.sections?.[0];
    const meters = section?.summary?.length ?? haversineMiles(origin.lat, origin.lng, destination.lat, destination.lng) * 1609.34;
    const seconds = section?.summary?.duration ?? 0;
    return {
      distanceMiles: meters / 1609.34,
      durationMinutes: Math.round(seconds / 60),
      geometry: { polyline: section?.polyline ?? null },
      originLat: origin.lat,
      originLng: origin.lng,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
      provider: "here",
      notices: [],
    };
  }

  async findStationsAlongRoute(input: StationSearchInput): Promise<RouteStation[]> {
    if (this.fallbackStations) {
      return this.fallbackStations(input);
    }
    return [];
  }

  async getFuelPrices(input: FuelPriceInput): Promise<FuelPriceQuote[]> {
    try {
      const params = new URLSearchParams({
        apiKey: this.apiKey,
        fuelType: input.fuelType ?? "diesel",
        limit: "20",
      });
      const response = await fetch(`${FUEL_URL}?${params.toString()}`);
      if (!response.ok) {
        return [];
      }
      const json = (await response.json()) as {
        stations?: Array<{
          id?: string;
          prices?: Array<{ fuelType?: string; price?: number; timestamp?: string }>;
        }>;
      };
      return (json.stations ?? []).map((station) => ({
        stationKey: station.id ?? "unknown",
        cashPrice: station.prices?.[0]?.price ?? null,
        creditPrice: station.prices?.[0]?.price ?? null,
        discountedPrice: null,
        observedAt: station.prices?.[0]?.timestamp ?? new Date().toISOString(),
        source: "provider" as const,
        stale: false,
      }));
    } catch {
      return [];
    }
  }

  private async resolvePoint(
    text: string,
    lat?: number | null,
    lng?: number | null,
  ): Promise<{ lat: number; lng: number }> {
    if (lat != null && lng != null) return { lat, lng };
    const params = new URLSearchParams({ q: text, apiKey: this.apiKey, limit: "1" });
    const response = await fetch(`${GEOCODE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Could not geocode "${text}" with HERE.`);
    }
    const json = (await response.json()) as {
      items?: Array<{ position?: { lat: number; lng: number } }>;
    };
    const position = json.items?.[0]?.position;
    if (!position) throw new Error(`No HERE geocode result for "${text}".`);
    return { lat: position.lat, lng: position.lng };
  }
}
