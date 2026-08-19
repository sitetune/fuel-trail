import { Card } from "@/components/ui/card";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { filterStationsWithinRadius, isPriceFresh, observePurchaseSavings } from "@/lib/routing/savings";
import { formatUsd } from "@/lib/utils";
import { PriceImportForm } from "@/components/fuel-planning/price-import-form";

export default async function SavingsPage() {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const radiusMiles = Number(user.organization.comparison_radius_miles ?? 15);
  const freshnessHours = Number(user.organization.price_freshness_hours ?? 72);
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number)")
    .eq("status", "verified")
    .order("purchased_at", { ascending: false })
    .limit(50);
  const { data: prices } = await supabase.from("station_latest_prices").select("*");
  const { data: stations } = await supabase.from("fuel_stations").select("id, name, latitude, longitude, trailer_policy");
  const stationById = new Map((stations ?? []).map((station) => [station.id as string, station]));
  const observations = (receipts ?? []).map((receipt) => {
    const paid = Number(receipt.price_per_gallon ?? 0);
    const origin = { latitude: null as number | null, longitude: null as number | null };
    const nearbyStations = filterStationsWithinRadius(
      (prices ?? []).map((row) => {
        const station = stationById.get(row.station_id as string);
        return {
          name: (station?.name as string | undefined) ?? "Station",
          price: Number(row.displayed_price),
          observedAt: (row.observed_at as string | null) ?? null,
          latitude: station?.latitude == null ? null : Number(station.latitude),
          longitude: station?.longitude == null ? null : Number(station.longitude),
          trailerPolicy: (station?.trailer_policy as string | null) ?? null,
        };
      }),
      origin,
      radiusMiles,
    ).filter(
      (station) =>
        Number.isFinite(station.price) &&
        station.price > 0 &&
        isPriceFresh(station.observedAt, freshnessHours),
    );
    const merchant = (receipt.merchant_name as string | null)?.toLowerCase() ?? "";
    const sameStationRecentPrices = (receipts ?? [])
      .filter(
        (other) =>
          other.id !== receipt.id &&
          other.merchant_name &&
          String(other.merchant_name).toLowerCase() === merchant &&
          other.price_per_gallon != null,
      )
      .slice(0, 8)
      .map((other) => Number(other.price_per_gallon));
    const nearbyPrices = nearbyStations.map((station) => station.price);
    return observePurchaseSavings({
      receiptId: receipt.id,
      unitNumber: (receipt.trucks as { unit_number: string }).unit_number,
      merchantName: receipt.merchant_name ?? "",
      paidPrice: paid,
      gallons: Number(receipt.gallons ?? 0),
      orgDayRegionAvg: nearbyPrices.length ? nearbyPrices.reduce((a, b) => a + b, 0) / nearbyPrices.length : null,
      nearbyStationPrices: nearbyPrices,
      sameStationRecentPrices,
      nearbyStations,
      radiusMiles,
      freshnessHours,
    });
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Savings Finder</h1>
      <p className="text-sm text-[#5E6B75]">
        Estimated only. Opportunities use stored receipts and manager/CSV prices. Comparison radius is {radiusMiles} miles;
        prices older than {freshnessHours} hours are ignored.
      </p>
      <div className="space-y-2">
        {observations.length === 0 ? <Card>No verified purchases yet.</Card> : null}
        {observations.map((row) => (
          <Card key={row.receiptId}>
            <p className="font-semibold">
              Unit {row.unitNumber} · {row.merchantName}
            </p>
            <p className="text-sm">
              Paid {formatUsd(row.paidPrice)}/gal. {row.explanation}
            </p>
            <p className="mt-1 text-xs text-[#5E6B75]">
              Confidence: {row.confidence}
              {row.comparisonPrice != null ? ` · comparable ${formatUsd(row.comparisonPrice)}/gal` : ""}
            </p>
            {row.trailerNotes.map((note) => (
              <p key={note} className="text-sm text-[#5E6B75]">
                {note}
              </p>
            ))}
            <ul className="mt-2 list-disc pl-5 text-xs text-[#5E6B75]">
              {row.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <PriceImportForm />
    </div>
  );
}
