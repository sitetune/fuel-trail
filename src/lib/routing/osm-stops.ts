import { haversineMiles } from "@/lib/routing/manual";

export type MappedFuelStop = {
  id: string;
  name: string;
  brand: string | null;
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  truckFriendly: boolean;
  diesel: boolean | null;
  source: "osm" | "org";
  orgStationId: string | null;
  price: number | null;
  priceObservedAt: string | null;
  miles: number | null;
};

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

const TRUCK_NAME =
  /\b(pilot|love'?s|loves travel|travelcenters|flying j|ta\b|petro|amaze|speedway|kwik trip|road ranger)\b/i;

const geocodeCache = new Map<string, { lat: number; lng: number; label: string }>();
let lastNominatimAt = 0;

function osmHeaders() {
  return {
    "User-Agent": "FuelTrail/0.1 (fleet fuel planner; https://fueltrail.app)",
    Accept: "application/json",
  };
}

async function nominatimGet(url: URL) {
  const wait = 1100 - (Date.now() - lastNominatimAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  const response = await fetch(url, {
    headers: osmHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  lastNominatimAt = Date.now();
  return response;
}

export function parseOverpassElements(elements: OverpassElement[]): MappedFuelStop[] {
  const stops: MappedFuelStop[] = [];
  for (const element of elements) {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat == null || lng == null) continue;
    const tags = element.tags ?? {};
    const name = tags.name || tags.brand || tags.operator || "Fuel stop";
    const truckFriendly =
      tags.hgv === "yes" ||
      tags.truck === "yes" ||
      tags.amenity === "truck_stop" ||
      tags.highway === "services" ||
      tags.highway === "rest_area" ||
      TRUCK_NAME.test(name) ||
      TRUCK_NAME.test(tags.brand ?? "");
    const diesel =
      tags["fuel:diesel"] === "yes" ? true : tags["fuel:diesel"] === "no" ? false : tags.fuel === "diesel" ? true : null;
    stops.push({
      id: `osm:${element.type ?? "node"}:${element.id ?? `${lat},${lng}`}`,
      name,
      brand: tags.brand ?? null,
      lat,
      lng,
      city: tags["addr:city"] ?? null,
      region: tags["addr:state"] ?? null,
      truckFriendly,
      diesel,
      source: "osm",
      orgStationId: null,
      price: null,
      priceObservedAt: null,
      miles: null,
    });
  }
  return stops;
}

export function isTruckFriendlyStop(stop: Pick<MappedFuelStop, "name" | "brand" | "truckFriendly">) {
  return stop.truckFriendly || TRUCK_NAME.test(stop.name) || TRUCK_NAME.test(stop.brand ?? "");
}

export async function geocodePlace(query: string) {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  const cached = geocodeCache.get(key);
  if (cached) return cached;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  const response = await nominatimGet(url);
  if (!response.ok) return null;
  const json = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const hit = json[0];
  if (!hit?.lat || !hit?.lon) return null;
  const place = { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name ?? query };
  geocodeCache.set(key, place);
  return place;
}

type NominatimHit = {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  osm_id?: number;
  osm_type?: string;
};

export function parseNominatimFuelResults(hits: NominatimHit[]): MappedFuelStop[] {
  const stops: MappedFuelStop[] = [];
  for (const hit of hits) {
    if (!hit.lat || !hit.lon) continue;
    const haystack = `${hit.class ?? ""} ${hit.type ?? ""} ${hit.name ?? ""} ${hit.display_name ?? ""}`;
    if (!/fuel|truck|petrol|gas|diesel|services/i.test(haystack)) continue;
    const name = hit.name || hit.display_name?.split(",")[0]?.trim() || "Fuel stop";
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    stops.push({
      id: `osm:${hit.osm_type ?? "node"}:${hit.osm_id ?? `${lat},${lng}`}`,
      name,
      brand: null,
      lat,
      lng,
      city: null,
      region: null,
      truckFriendly: isTruckFriendlyStop({ name, brand: null, truckFriendly: /truck|hgv|pilot|love/i.test(haystack) }),
      diesel: /diesel|truck/i.test(haystack) ? true : null,
      source: "osm",
      orgStationId: null,
      price: null,
      priceObservedAt: null,
      miles: null,
    });
  }
  return stops;
}

export async function queryOverpassAround(input: { lat: number; lng: number; radiusMeters: number }) {
  const query = `
[out:json][timeout:12];
(
  node["amenity"="fuel"](around:${input.radiusMeters},${input.lat},${input.lng});
  node["amenity"="truck_stop"](around:${input.radiusMeters},${input.lat},${input.lng});
  way["amenity"="fuel"](around:${input.radiusMeters},${input.lat},${input.lng});
  way["amenity"="truck_stop"](around:${input.radiusMeters},${input.lat},${input.lng});
);
out center 60;
`.trim();
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];
  let lastError: Error | null = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: osmHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) {
        lastError = new Error(`Overpass ${response.status}`);
        continue;
      }
      const json = (await response.json()) as { elements?: OverpassElement[] };
      return parseOverpassElements(json.elements ?? []);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overpass failed");
    }
  }
  throw lastError ?? new Error("Could not reach OpenStreetMap Overpass.");
}

export async function searchNominatimFuel(input: { lat: number; lng: number; truckOnly?: boolean }) {
  const delta = 0.28;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "40");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", `${input.lng - delta},${input.lat + delta},${input.lng + delta},${input.lat - delta}`);
  url.searchParams.set("q", input.truckOnly ? "truck stop" : "fuel");
  const response = await nominatimGet(url);
  if (!response.ok) return [];
  const json = (await response.json()) as NominatimHit[];
  return parseNominatimFuelResults(Array.isArray(json) ? json : []);
}

export function attachOrgPrices(
  stops: MappedFuelStop[],
  orgStations: Array<{
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    city?: string | null;
    region?: string | null;
    price?: number | null;
    observedAt?: string | null;
  }>,
  origin: { lat: number; lng: number },
) {
  const withMiles = stops.map((stop) => ({
    ...stop,
    miles: haversineMiles(origin.lat, origin.lng, stop.lat, stop.lng),
  }));
  for (const org of orgStations) {
    if (org.latitude == null || org.longitude == null) continue;
    let nearest: MappedFuelStop | null = null;
    let nearestMiles = Infinity;
    for (const stop of withMiles) {
      const miles = haversineMiles(stop.lat, stop.lng, org.latitude, org.longitude);
      if (miles < nearestMiles) {
        nearestMiles = miles;
        nearest = stop;
      }
    }
    if (nearest && nearestMiles <= 0.4) {
      nearest.orgStationId = org.id;
      nearest.price = org.price ?? nearest.price;
      nearest.priceObservedAt = org.observedAt ?? nearest.priceObservedAt;
      if (org.name && nearest.name === "Fuel stop") nearest.name = org.name;
    } else {
      withMiles.push({
        id: `org:${org.id}`,
        name: org.name,
        brand: null,
        lat: org.latitude,
        lng: org.longitude,
        city: org.city ?? null,
        region: org.region ?? null,
        truckFriendly: true,
        diesel: true,
        source: "org",
        orgStationId: org.id,
        price: org.price ?? null,
        priceObservedAt: org.observedAt ?? null,
        miles: haversineMiles(origin.lat, origin.lng, org.latitude, org.longitude),
      });
    }
  }
  return withMiles.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
}
