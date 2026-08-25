import { z } from "zod";
import { AuthError, requireWriteManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getFuelRouteProvider, rankRouteCandidates } from "@/lib/routing";
import { haversineMiles } from "@/lib/routing/manual";
import { issueRoutePlanToDriver } from "@/lib/routing/issue-plan";
import type { RouteStation } from "@/lib/routing/types";

const bodySchema = z.object({
  truckId: z.string().uuid(),
  originText: z.string().min(1),
  destinationText: z.string().min(1),
  originLat: z.number().optional(),
  originLng: z.number().optional(),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  currentEstimatedGallons: z.number().nonnegative().optional(),
  arrivalReserveGallons: z.number().nonnegative().optional(),
  trailerAttached: z.boolean().default(true),
  departureAt: z.string().optional(),
  issueToDriver: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireWriteManagement();
    const limited = await enforceRateLimit({
      bucket: "route",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const body = bodySchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const { data: truck } = await supabase
      .from("trucks")
      .select("*")
      .eq("id", body.truckId)
      .eq("organization_id", user.organization.id)
      .single();
    if (!truck) return apiError(404, "not_found", "Truck not found.");
    const { data: estimate } = await supabase
      .from("latest_fuel_estimates")
      .select("*")
      .eq("truck_id", body.truckId)
      .maybeSingle();
    const { data: assignment } = await supabase
      .from("driver_truck_assignments")
      .select("driver_id")
      .eq("truck_id", body.truckId)
      .is("ends_at", null)
      .maybeSingle();

    const provider = getFuelRouteProvider({
      getStationsAlongManualRoute: async ({ route }) => {
        const { data: stations } = await supabase
          .from("fuel_stations")
          .select("*")
          .eq("organization_id", user.organization.id);
        return (stations ?? [])
          .filter((station) => station.latitude != null && station.longitude != null)
          .map((station) => {
            const detour = haversineMiles(
              route.originLat,
              route.originLng,
              Number(station.latitude),
              Number(station.longitude),
            );
            return {
              id: station.id,
              name: station.name,
              address: station.address ?? "",
              city: station.city ?? "",
              region: station.region ?? "",
              postalCode: station.postal_code,
              latitude: Number(station.latitude),
              longitude: Number(station.longitude),
              truckAccess: station.truck_access,
              parkingAvailable: station.parking_available,
              parkingVerifiedAt: station.parking_verified_at,
              trailerPolicy: station.trailer_policy,
              dropLocationVerifiedAt: station.drop_location_verified_at,
              routeMile: detour,
              detourMiles: detour,
              detourMinutes: Math.round((detour / 45) * 60),
            } satisfies RouteStation & { id: string };
          });
      },
      getPrices: async () => {
        const { data } = await supabase.from("station_latest_prices").select("*");
        return (data ?? []).map((row) => ({
          stationKey: row.station_id,
          cashPrice: row.cash_price === null ? null : Number(row.cash_price),
          creditPrice: row.credit_price === null ? null : Number(row.credit_price),
          discountedPrice: row.discounted_price === null ? null : Number(row.discounted_price),
          observedAt: row.observed_at,
          source: row.source,
          stale:
            Date.now() - new Date(row.observed_at).getTime() >
            user.organization.price_freshness_hours * 3600 * 1000,
        }));
      },
    });

    const notices: string[] = [];
    let route;
    try {
      route = await provider.getTruckRoute({
        originText: body.originText,
        destinationText: body.destinationText,
        originLat: body.originLat,
        originLng: body.originLng,
        destinationLat: body.destinationLat,
        destinationLng: body.destinationLng,
        departureAt: body.departureAt,
      });
    } catch (error) {
      return apiError(
        400,
        "route_unavailable",
        error instanceof Error ? error.message : "Could not build a truck route.",
      );
    }

    const stations = await provider.findStationsAlongRoute({ route });
    const prices = await provider.getFuelPrices({});
    const freshnessHours = user.organization.price_freshness_hours;
    const ranked = rankRouteCandidates({
      stations: stations.map((station) => {
        const withId = station as RouteStation & { id?: string };
        const price = prices.find((quote) => quote.stationKey === withId.id);
        const displayed = price?.discountedPrice ?? price?.cashPrice ?? price?.creditPrice ?? null;
        const ageHours = price
          ? (Date.now() - new Date(price.observedAt).getTime()) / 3600000
          : Infinity;
        return {
          ...withId,
          id: withId.id ?? crypto.randomUUID(),
          displayedPrice: displayed,
          priceObservedAt: price?.observedAt ?? null,
          priceFresh: ageHours <= freshnessHours,
        };
      }),
      estimatedGallons:
        body.currentEstimatedGallons ?? Number(estimate?.estimated_after_gallons ?? 0),
      tankCapacityGallons: Number(truck.tank_capacity_gallons),
      reserveGallons: Number(truck.reserve_gallons),
      targetMpg: Number(truck.target_mpg),
      remainingRouteMiles: route.distanceMiles,
      trailerAttached: body.trailerAttached,
      costPerMile: user.organization.default_cost_per_mile,
      driverTimeValueHourly: user.organization.default_driver_time_value_hourly,
      trailerDropPenalty: user.organization.default_trailer_drop_penalty,
      arrivalReserveGallons: body.arrivalReserveGallons ?? Number(truck.reserve_gallons),
    });

    const best = ranked.find((candidate) => candidate.rank === 1) ?? null;
    const { data: plan } = await supabase
      .from("route_plans")
      .insert({
        organization_id: user.organization.id,
        truck_id: body.truckId,
        driver_id: assignment?.driver_id ?? null,
        created_by: user.authUserId,
        origin_text: body.originText,
        origin_latitude: route.originLat,
        origin_longitude: route.originLng,
        destination_text: body.destinationText,
        destination_latitude: route.destinationLat,
        destination_longitude: route.destinationLng,
        departure_at: body.departureAt ?? null,
        route_distance_miles: route.distanceMiles,
        route_duration_minutes: route.durationMinutes,
        route_geometry: route.geometry,
        current_estimated_gallons:
          body.currentEstimatedGallons ?? estimate?.estimated_after_gallons ?? null,
        recommended_station_id: best?.stationId ?? null,
        recommended_purchase_gallons: best?.gallonsRecommended ?? null,
        recommendation_explanation: best,
        trailer_attached: body.trailerAttached,
        status: "draft",
      })
      .select("id")
      .single();

    let driverNotified = false;
    if (plan) {
      await supabase.from("route_stop_candidates").insert(
        ranked.map((candidate) => ({
          organization_id: user.organization.id,
          route_plan_id: plan.id,
          station_id: candidate.stationId,
          rank: candidate.rank,
          route_mile: candidate.routeMile,
          detour_miles: candidate.detourMiles,
          detour_minutes: candidate.detourMinutes,
          displayed_price: candidate.displayedPrice,
          effective_trip_cost: candidate.effectiveCost,
          truck_access: candidate.truckAccess,
          trailer_decision: candidate.trailerDecision,
          parking_verified: candidate.parkingVerified,
          gallons_recommended: candidate.gallonsRecommended,
          excluded: candidate.excluded,
          exclusion_reason: candidate.exclusionReason,
          explanation: candidate.explanation,
          assumptions: candidate.assumptions,
        })),
      );
      if (body.issueToDriver) {
        const issued = await issueRoutePlanToDriver(user, plan.id);
        driverNotified = issued.ok;
        if (issued.ok) notices.push("Fuel-stop notification sent to the assigned driver.");
        else notices.push(issued.message);
      }
    }

    if (route.provider === "manual") notices.push(...route.notices);
    if (process.env.FUEL_ROUTE_PROVIDER === "here" && !process.env.HERE_API_KEY) {
      notices.push("HERE_API_KEY is not configured; using manual routing.");
    }

    return apiOk({ planId: plan?.id, route, ranked, recommendation: best, notices, issued: driverNotified });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "plan_failed", "Could not plan a fuel stop.");
  }
}
