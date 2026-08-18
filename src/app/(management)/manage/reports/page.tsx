import { IFTA_LIMITATION_NOTE, groupIftaWorksheet } from "@/lib/reports/ifta";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { weightedAveragePrice } from "@/lib/calculations";
import { formatUsd } from "@/lib/utils";

export default async function ReportsPage() {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number)")
    .in("status", ["submitted", "verified"]);
  const byTruck = new Map<string, { gallons: number; spend: number; count: number }>();
  for (const row of receipts ?? []) {
    const unit = (row.trucks as { unit_number: string }).unit_number;
    const current = byTruck.get(unit) ?? { gallons: 0, spend: 0, count: 0 };
    current.gallons += Number(row.gallons ?? 0);
    current.spend += Number(row.total_amount ?? 0);
    current.count += 1;
    byTruck.set(unit, current);
  }
  const ifta = groupIftaWorksheet(
    (receipts ?? []).map((row) => ({
      organizationName: user.organization.name,
      unitNumber: (row.trucks as { unit_number: string }).unit_number,
      vin: null,
      driverName: null,
      purchaserName: row.purchaser_name,
      purchasedAt: row.purchased_at ?? new Date().toISOString(),
      merchantName: row.merchant_name ?? "",
      merchantAddress: "",
      jurisdiction: row.merchant_region ?? "",
      gallons: Number(row.gallons ?? 0),
      fuelType: row.fuel_type,
      pricePerGallon: row.price_per_gallon === null ? null : Number(row.price_per_gallon),
      total: Number(row.total_amount ?? 0),
      receiptNumber: row.receipt_number,
      verificationStatus: row.status,
      receiptId: row.id,
    })),
  );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Reports</h1>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="amber">
          <a href="/api/reports/fuel.csv">Download truck fuel CSV</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/reports/ifta-fuel.csv">Download IFTA-ready fuel CSV</a>
        </Button>
      </div>
      <Card>
        <h2 className="font-semibold">Truck fuel report</h2>
        <p className="mb-3 text-sm text-[#5E6B75]">Default grouping is by truck.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Truck</th>
                <th>Gallons</th>
                <th>Spend</th>
                <th>Avg price</th>
                <th>Receipts</th>
                <th>Miles / MPG / $/mi</th>
              </tr>
            </thead>
            <tbody>
              {[...byTruck.entries()].map(([unit, stats]) => (
                <tr key={unit} className="border-b">
                  <td className="py-2">{unit}</td>
                  <td>{stats.gallons.toFixed(1)}</td>
                  <td>{formatUsd(stats.spend)}</td>
                  <td>
                    {weightedAveragePrice({ spend: stats.spend, gallons: stats.gallons }) === null
                      ? "—"
                      : formatUsd(weightedAveragePrice({ spend: stats.spend, gallons: stats.gallons }) ?? 0)}
                  </td>
                  <td>{stats.count}</td>
                  <td>Mileage unavailable</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">IFTA-ready fuel purchase worksheet</h2>
        <p className="my-2 rounded bg-[#F5A524]/20 p-3 text-sm">{IFTA_LIMITATION_NOTE}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Quarter</th>
                <th>Truck</th>
                <th>Jurisdiction</th>
                <th>Fuel</th>
                <th>Gallons</th>
                <th>Total</th>
                <th>Receipts</th>
              </tr>
            </thead>
            <tbody>
              {ifta.map((row) => (
                <tr key={`${row.quarter}-${row.unitNumber}-${row.jurisdiction}`} className="border-b">
                  <td className="py-2">{row.quarter}</td>
                  <td>{row.unitNumber}</td>
                  <td>{row.jurisdiction}</td>
                  <td>{row.fuelType}</td>
                  <td>{row.gallons.toFixed(1)}</td>
                  <td>{formatUsd(row.total)}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
