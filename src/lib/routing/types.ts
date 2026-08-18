import type { YesNoUnknown, TrailerPolicy } from "@/types/domain";

export type TruckRouteInput = {
  originText: string;
  destinationText: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  departureAt?: string | null;
};

export type TruckRoute = {
  distanceMiles: number;
  durationMinutes: number;
  geometry: unknown;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  provider: string;
  notices: string[];
};

export type StationSearchInput = {
  route: TruckRoute;
  radiusMiles?: number;
};

export type RouteStation = {
  externalId?: string | null;
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  truckAccess: YesNoUnknown;
  parkingAvailable: YesNoUnknown;
  parkingVerifiedAt: string | null;
  trailerPolicy: TrailerPolicy;
  dropLocationVerifiedAt: string | null;
  routeMile: number;
  detourMiles: number;
  detourMinutes: number;
};

export type FuelPriceInput = {
  stationExternalIds?: string[];
  stationIds?: string[];
  fuelType?: string;
};

export type FuelPriceQuote = {
  stationKey: string;
  cashPrice: number | null;
  creditPrice: number | null;
  discountedPrice: number | null;
  observedAt: string;
  source: "manager" | "csv_import" | "receipt" | "provider";
  stale: boolean;
};

export interface FuelRouteProvider {
  getTruckRoute(input: TruckRouteInput): Promise<TruckRoute>;
  findStationsAlongRoute(input: StationSearchInput): Promise<RouteStation[]>;
  getFuelPrices(input: FuelPriceInput): Promise<FuelPriceQuote[]>;
}

export type RankedStopCandidate = {
  stationId: string;
  name: string;
  displayedPrice: number | null;
  gallonsRecommended: number;
  effectiveCost: number | null;
  rank: number | null;
  excluded: boolean;
  exclusionReason: string | null;
  explanation: string;
  assumptions: string[];
  truckAccess: YesNoUnknown;
  trailerDecision: "stay_attached" | "drop_required" | "unknown";
  parkingVerified: boolean;
  routeMile: number;
  detourMiles: number;
  detourMinutes: number;
};
