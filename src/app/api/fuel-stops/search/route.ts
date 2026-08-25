import { z } from "zod";
import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  attachOrgPrices,
  geocodePlace,
  isTruckFriendlyStop,
  queryOverpassAround,
  searchNominatimFuel,
} from "@/lib/routing/osm-stops";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  truckOnly: z.enum(["1", "0"]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireManagement();
    const limited = await enforceRateLimit({
      bucket: "fuelStops",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      q: url.searchParams.get("q") ?? undefined,
      lat: url.searchParams.get("lat") ?? undefined,
      lng: url.searchParams.get("lng") ?? undefined,
      truckOnly: url.searchParams.get("truckOnly") ?? undefined,
    });
    let lat = parsed.lat;
    let lng = parsed.lng;
    let label = parsed.q ?? "Selected area";
    if ((lat == null || lng == null) && parsed.q) {
      const place = await geocodePlace(parsed.q);
      if (!place) return apiError(404, "not_found", "Could not find that place.");
      lat = place.lat;
      lng = place.lng;
      label = place.label;
    }
    if (lat == null || lng == null) {
      return apiError(400, "invalid_query", "Search a city or click the map.");
    }

    let osmStops: Awaited<ReturnType<typeof queryOverpassAround>> = [];
    let notice: string | null = null;
    try {
      osmStops = await queryOverpassAround({ lat, lng, radiusMeters: 15000 });
    } catch {
      osmStops = [];
    }
    if (osmStops.length === 0) {
      try {
        osmStops = await searchNominatimFuel({ lat, lng, truckOnly: parsed.truckOnly !== "0" });
        notice = osmStops.length
          ? "Showing OpenStreetMap place results."
          : "OpenStreetMap is busy. Showing your saved stations if any.";
      } catch {
        notice = "OpenStreetMap is busy. Showing your saved stations if any.";
      }
    }

    const supabase = await createServerSupabaseClient();
    const [{ data: stations }, { data: prices }] = await Promise.all([
      supabase.from("fuel_stations").select("id, name, latitude, longitude, city, region"),
      supabase.from("station_latest_prices").select("station_id, displayed_price, observed_at"),
    ]);
    const priceByStation = new Map(
      (prices ?? []).map((row) => [
        row.station_id as string,
        { price: row.displayed_price == null ? null : Number(row.displayed_price), observedAt: row.observed_at as string | null },
      ]),
    );
    const orgStations = (stations ?? []).map((station) => ({
      id: station.id as string,
      name: station.name as string,
      latitude: station.latitude == null ? null : Number(station.latitude),
      longitude: station.longitude == null ? null : Number(station.longitude),
      city: (station.city as string | null) ?? null,
      region: (station.region as string | null) ?? null,
      price: priceByStation.get(station.id as string)?.price ?? null,
      observedAt: priceByStation.get(station.id as string)?.observedAt ?? null,
    }));
    let stops = attachOrgPrices(osmStops, orgStations, { lat, lng }).filter((stop) => (stop.miles ?? 0) <= 20);
    if (parsed.truckOnly !== "0") {
      const truckStops = stops.filter((stop) => isTruckFriendlyStop(stop));
      if (truckStops.length) stops = truckStops;
    }
    return apiOk({
      center: { lat, lng, label },
      stops: stops.slice(0, 80),
      notice,
      priceSource:
        "Pump prices are from your imported or receipt-backed station file when we can match a stop. OpenStreetMap supplies locations, not live GasBuddy prices.",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "search_failed", "Could not search fuel stops.");
  }
}
