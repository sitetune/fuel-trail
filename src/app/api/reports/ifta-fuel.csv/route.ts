import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { iftaFuelCsv, type FuelReportRow } from "@/lib/reports/ifta";

export async function GET(request: Request) {
  try {
    const user = await requireManagement();
    const url = new URL(request.url);
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("fuel_receipts")
      .select("*, trucks(unit_number, vin), profiles:driver_id(full_name)")
      .eq("organization_id", user.organization.id)
      .in("status", ["submitted", "verified"]);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (from) query = query.gte("purchased_at", from);
    if (to) query = query.lte("purchased_at", to);
    const { data, error } = await query.order("purchased_at", { ascending: true });
    if (error) return apiError(400, "report_failed", "Could not build IFTA worksheet.");
    const rows: FuelReportRow[] = (data ?? []).map((row) => ({
      organizationName: user.organization.name,
      unitNumber: (row.trucks as { unit_number: string } | null)?.unit_number ?? "",
      vin: (row.trucks as { vin: string | null } | null)?.vin ?? null,
      driverName: (row.profiles as { full_name: string } | null)?.full_name ?? null,
      purchaserName: row.purchaser_name,
      purchasedAt: row.purchased_at,
      merchantName: row.merchant_name,
      merchantAddress: [row.merchant_address, row.merchant_city, row.merchant_region]
        .filter(Boolean)
        .join(", "),
      jurisdiction: row.merchant_region ?? "",
      gallons: Number(row.gallons ?? 0),
      fuelType: row.fuel_type,
      pricePerGallon: row.price_per_gallon === null ? null : Number(row.price_per_gallon),
      total: Number(row.total_amount ?? 0),
      receiptNumber: row.receipt_number,
      verificationStatus: row.status,
      receiptId: row.id,
    }));
    const csv = iftaFuelCsv(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fueltrail-ifta-fuel.csv"',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "report_failed", "Could not export IFTA worksheet.");
  }
}
