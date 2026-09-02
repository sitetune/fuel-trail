import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/domain";
import type { FuelReportRow } from "@/lib/reports/ifta";
import { inclusiveDateRangeIso } from "@/lib/calculations/dates";
import { type ReportFilters } from "@/lib/reports/filters";

export type { ReportFilters } from "@/lib/reports/filters";
export { parseReportFilters, reportFiltersAreActive } from "@/lib/reports/filters";

export async function queryFuelReportRows(user: SessionUser, filters: ReportFilters) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number, vin), profiles:driver_id(full_name)")
    .eq("organization_id", user.organization.id);
  if (filters.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.in("status", ["submitted", "verified"]);
  }
  const timezone = user.organization.timezone || "America/Chicago";
  if (filters.from) {
    const range = inclusiveDateRangeIso(filters.from, filters.to ?? null, timezone);
    query = query.gte("purchased_at", range.startIso);
    if (range.endExclusiveIso) query = query.lt("purchased_at", range.endExclusiveIso);
  } else if (filters.to) {
    const range = inclusiveDateRangeIso("1970-01-01", filters.to, timezone);
    if (range.endExclusiveIso) query = query.lt("purchased_at", range.endExclusiveIso);
  }
  if (filters.truckId) query = query.eq("truck_id", filters.truckId);
  if (filters.driverId) query = query.eq("driver_id", filters.driverId);
  if (filters.jurisdiction) query = query.ilike("merchant_region", filters.jurisdiction);
  if (filters.merchant) query = query.ilike("merchant_name", `%${filters.merchant}%`);
  if (filters.fuelType) query = query.eq("fuel_type", filters.fuelType);
  if (filters.report === "reported") query = query.not("last_reported_at", "is", null);
  if (filters.report === "unreported") query = query.is("last_reported_at", null);
  const { data, error } = await query.order("purchased_at", { ascending: true });
  if (error) throw new Error("Could not build fuel report.");
  const rows: FuelReportRow[] = (data ?? []).map((row) => ({
    organizationName: user.organization.name,
    unitNumber: (row.trucks as { unit_number: string } | null)?.unit_number ?? "",
    vin: (row.trucks as { vin: string | null } | null)?.vin ?? null,
    driverName: (row.profiles as { full_name: string } | null)?.full_name ?? null,
    purchaserName: row.purchaser_name as string,
    purchasedAt: row.purchased_at as string,
    merchantName: row.merchant_name as string,
    merchantAddress: [row.merchant_address, row.merchant_city, row.merchant_region].filter(Boolean).join(", "),
    jurisdiction: (row.merchant_region as string | null) ?? "",
    gallons: Number(row.gallons ?? 0),
    fuelType: row.fuel_type as string,
    pricePerGallon: row.price_per_gallon === null ? null : Number(row.price_per_gallon),
    total: Number(row.total_amount ?? 0),
    receiptNumber: row.receipt_number as string | null,
    verificationStatus: row.status as string,
    receiptId: row.id as string,
  }));
  return { receipts: data ?? [], rows };
}

export async function snapshotReportRun(input: {
  user: SessionUser;
  reportType: string;
  filters: ReportFilters;
  receipts: Array<Record<string, unknown>>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: run, error } = await supabase
    .from("report_runs")
    .insert({
      organization_id: input.user.organization.id,
      created_by: input.user.authUserId,
      report_type: input.reportType,
      filters: input.filters,
      receipt_count: input.receipts.length,
    })
    .select("id")
    .single();
  if (error || !run) return null;
  if (input.receipts.length) {
    await supabase.from("report_run_receipts").insert(
      input.receipts.map((receipt) => ({
        report_run_id: run.id,
        receipt_id: receipt.id,
        snapshot: {
          gallons: receipt.gallons,
          total_amount: receipt.total_amount,
          price_per_gallon: receipt.price_per_gallon,
          merchant_name: receipt.merchant_name,
          merchant_region: receipt.merchant_region,
          purchased_at: receipt.purchased_at,
          status: receipt.status,
          fuel_type: receipt.fuel_type,
        },
      })),
    );
    const ids = input.receipts.map((receipt) => receipt.id as string);
    await supabase
      .from("fuel_receipts")
      .update({ last_reported_at: new Date().toISOString() })
      .eq("organization_id", input.user.organization.id)
      .in("id", ids)
      .is("last_reported_at", null);
  }
  await supabase.from("app_audit_events").insert({
    organization_id: input.user.organization.id,
    actor_id: input.user.authUserId,
    entity_type: "report_run",
    entity_id: run.id,
    event_type: "report_generated",
    metadata: { reportType: input.reportType, count: input.receipts.length, filters: input.filters },
  });
  return run.id as string;
}
