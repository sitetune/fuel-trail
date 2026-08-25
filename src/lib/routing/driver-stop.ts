import { buildStopLocationHint } from "@/lib/routing/location-hint";
import { reverseGeocodePlace } from "@/lib/routing/osm-stops";

export const DRIVER_FUEL_STOP_SELECT =
  "id, origin_text, destination_text, origin_latitude, origin_longitude, destination_latitude, destination_longitude, recommended_purchase_gallons, trailer_attached, recommendation_explanation, fuel_stations:recommended_station_id(name, address, city, region, postal_code, latitude, longitude, truck_access, parking_available, trailer_policy, manager_notes)";

export type DriverFuelStopStation = {
  name: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  truck_access: string | null;
  parking_available: string | null;
  trailer_policy: string | null;
  manager_notes: string | null;
};

export type DriverFuelStopPlan = {
  id: string;
  origin_text: string;
  destination_text: string;
  origin_latitude: number | string | null;
  origin_longitude: number | string | null;
  destination_latitude: number | string | null;
  destination_longitude: number | string | null;
  recommended_purchase_gallons: number | string | null;
  trailer_attached: boolean | null;
  recommendation_explanation: unknown;
  fuel_stations: DriverFuelStopStation | DriverFuelStopStation[] | null;
};

export type DriverFuelStopView = {
  planId: string;
  name: string;
  addressLine: string | null;
  highwayLine: string | null;
  locality: string | null;
  lat: number | null;
  lng: number | null;
  gallons: number | null;
  originText: string;
  destinationText: string;
  trailerAttached: boolean;
  truckAccess: string | null;
  parkingAvailable: string | null;
  trailerPolicy: string | null;
  managerNotes: string | null;
  explanation: string | null;
  source: "station" | "destination" | "origin";
};

function coord(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stationOf(plan: DriverFuelStopPlan): DriverFuelStopStation | null {
  const raw = plan.fuel_stations;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function locality(city: string | null | undefined, region: string | null | undefined) {
  return [city, region].filter(Boolean).join(", ") || null;
}

function explanationFromJson(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.explanation === "string" && rec.explanation.trim()) return rec.explanation.trim();
  return null;
}

function withLocationHint(
  stop: Omit<DriverFuelStopView, "highwayLine"> & { highwayLine?: string | null },
  reverse?: Parameters<typeof buildStopLocationHint>[0]["reverse"],
): DriverFuelStopView {
  const hint = buildStopLocationHint({
    name: stop.name,
    addressLine: stop.addressLine,
    locality: stop.locality,
    reverse,
  });
  return {
    ...stop,
    addressLine: hint.addressLine,
    highwayLine: hint.highwayLine,
    locality: hint.locality,
  };
}

export function resolveDriverFuelStop(plan: DriverFuelStopPlan): DriverFuelStopView {
  const station = stationOf(plan);
  const stationLat = coord(station?.latitude);
  const stationLng = coord(station?.longitude);
  const destLat = coord(plan.destination_latitude);
  const destLng = coord(plan.destination_longitude);
  const originLat = coord(plan.origin_latitude);
  const originLng = coord(plan.origin_longitude);
  const gallons = coord(plan.recommended_purchase_gallons);

  if (station && stationLat != null && stationLng != null) {
    return withLocationHint({
      planId: plan.id,
      name: station.name?.trim() || plan.destination_text,
      addressLine: station.address,
      locality: locality(station.city, station.region),
      lat: stationLat,
      lng: stationLng,
      gallons,
      originText: plan.origin_text,
      destinationText: plan.destination_text,
      trailerAttached: Boolean(plan.trailer_attached),
      truckAccess: station.truck_access,
      parkingAvailable: station.parking_available,
      trailerPolicy: station.trailer_policy,
      managerNotes: station.manager_notes,
      explanation: explanationFromJson(plan.recommendation_explanation),
      source: "station",
    });
  }

  const useDestination = destLat != null && destLng != null;
  return withLocationHint({
    planId: plan.id,
    name: (useDestination ? plan.destination_text : plan.origin_text).trim() || "Assigned stop",
    addressLine: null,
    locality: null,
    lat: useDestination ? destLat : originLat,
    lng: useDestination ? destLng : originLng,
    gallons,
    originText: plan.origin_text,
    destinationText: plan.destination_text,
    trailerAttached: Boolean(plan.trailer_attached),
    truckAccess: station?.truck_access ?? null,
    parkingAvailable: station?.parking_available ?? null,
    trailerPolicy: station?.trailer_policy ?? null,
    managerNotes: station?.manager_notes ?? null,
    explanation: explanationFromJson(plan.recommendation_explanation),
    source: useDestination ? "destination" : "origin",
  });
}

export async function enrichDriverFuelStop(stop: DriverFuelStopView): Promise<DriverFuelStopView> {
  if (stop.addressLine && stop.locality) return stop;
  if (stop.lat == null || stop.lng == null) return stop;
  try {
    const reverse = await reverseGeocodePlace(stop.lat, stop.lng);
    if (!reverse) return stop;
    return withLocationHint(stop, reverse);
  } catch {
    return stop;
  }
}

export function driverFuelStopHref(planId: string) {
  return `/driver/fuel-stop/${planId}`;
}

export function driverFuelStopNotificationBody(stop: DriverFuelStopView) {
  const gallons =
    stop.gallons != null ? `Buy about ${Math.round(stop.gallons)} gal.` : "Fuel there if you need it.";
  const where = [stop.addressLine, stop.highwayLine, stop.locality].filter(Boolean).join(", ");
  const place = where ? `${stop.name} (${where})` : stop.name;
  return `Stop at ${place}. ${gallons} Route: ${stop.originText} → ${stop.destinationText}. You make the final safety decision.`;
}
