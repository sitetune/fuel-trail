import { Card } from "@/components/ui/card";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { observePurchaseSavings } from "@/lib/routing/savings";
import { formatUsd } from "@/lib/utils";
import { PriceImportForm } from "@/components/fuel-planning/price-import-form";

export default async function SavingsPage() {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number)")
    .eq("status", "verified");
  const { data: prices } = await supabase.from("station_latest_prices").select("*");
  const observations = (receipts ?? []).map((receipt) => {
    const paid = Number(receipt.price_per_gallon ?? 0);
    const nearby = (prices ?? [])
      .map((row) => Number(row.displayed_price))
      .filter((value) => Number.isFinite(value) && value > 0);
    return observePurchaseSavings({
      receiptId: receipt.id,
      unitNumber: (receipt.trucks as { unit_number: string }).unit_number,
      merchantName: receipt.merchant_name ?? "",
      paidPrice: paid,
      gallons: Number(receipt.gallons ?? 0),
      orgDayRegionAvg: nearby.length ? nearby.reduce((a, b) => a + b, 0) / nearby.length : null,
      nearbyStationPrices: nearby,
      sameStationRecentPrices: [],
    });
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Savings Finder</h1>
      <p className="text-sm text-[#5E6B75]">
        Opportunities use stored receipts and manager/CSV/provider prices only. Prices are never
        invented. {user.organization.name} comparison radius is {user.organization.comparison_radius_miles} miles.
      </p>
      <div className="space-y-2">
        {observations.length === 0 ? <Card>No verified purchases yet.</Card> : null}
        {observations.map((row) => (
          <Card key={row.receiptId}>
            <p className="font-semibold">
              Unit {row.unitNumber} · {row.merchantName}
            </p>
            <p className="text-sm">
              Paid {formatUsd(row.paidPrice)}/gal.{" "}
              {row.opportunity === null ? row.explanation : `${row.explanation}`}
            </p>
          </Card>
        ))}
      </div>
      <PriceImportForm />
    </div>
  );
}
