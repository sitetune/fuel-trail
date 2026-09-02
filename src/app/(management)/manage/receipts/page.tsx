import Link from "next/link";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ReceiptStatusBadge } from "@/components/receipts/status-badge";
import { ReceiptThumb } from "@/components/receipts/receipt-thumb";
import { ReceiptFilterForm } from "@/components/management/receipt-filter-form";
import {
  RECEIPT_PAGE_SIZE,
  parseReceiptCenterFilters,
  receiptCenterQuery,
  receiptSearchOrFilter,
} from "@/lib/receipts/list";
import { formatCityState, formatPricePerGallon, formatShortDate, ocrConfidenceLabel } from "@/lib/receipts/format";
import { isLowOcrConfidence } from "@/lib/receipts/states";
import { formatGallons, formatUsd } from "@/lib/utils";

export default async function ReceiptCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManagement();
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const filters = parseReceiptCenterFilters(flat);
  const supabase = await createServerSupabaseClient();
  const [{ data: trucks }, { data: drivers }] = await Promise.all([
    supabase.from("trucks").select("id, unit_number").order("unit_number"),
    supabase.from("profiles").select("id, full_name").eq("role", "driver").order("full_name"),
  ]);

  let query = supabase
    .from("fuel_receipts")
    .select(
      "id, status, purchased_at, submitted_at, merchant_name, merchant_city, merchant_region, gallons, price_per_gallon, total_amount, ocr_confidence, verified_at, rejected_at, last_reported_at, amended_at, receipt_number, trucks(unit_number), profiles:driver_id(full_name), reviewer:profiles!verified_by(full_name), rejector:profiles!rejected_by(full_name)",
      { count: "exact" },
    );
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.truckId) query = query.eq("truck_id", filters.truckId);
  if (filters.driverId) query = query.eq("driver_id", filters.driverId);
  if (filters.merchant) query = query.ilike("merchant_name", `%${filters.merchant}%`);
  if (filters.region) query = query.eq("merchant_region", filters.region);
  if (filters.from) query = query.gte("purchased_at", `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte("purchased_at", `${filters.to}T23:59:59`);
  if (filters.ocr === "low") query = query.lt("ocr_confidence", 0.6);
  if (filters.ocr === "ok") query = query.gte("ocr_confidence", 0.6);
  if (filters.report === "reported") query = query.not("last_reported_at", "is", null);
  if (filters.report === "unreported") query = query.is("last_reported_at", null);
  const search = filters.q ? receiptSearchOrFilter(filters.q) : null;
  if (search) query = query.or(search);
  const sort = filters.sort ?? "purchased_at";
  const ascending = filters.dir === "asc";
  const from = ((filters.page ?? 1) - 1) * RECEIPT_PAGE_SIZE;
  const { data: receipts, count } = await query
    .order(sort, { ascending, nullsFirst: false })
    .range(from, from + RECEIPT_PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / RECEIPT_PAGE_SIZE));
  const page = filters.page ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description={`${total} receipt${total === 1 ? "" : "s"} in this view.`}
        actions={
          <Button asChild variant="ghost">
            <Link href="/manage/receipts">Clear filters</Link>
          </Button>
        }
      />
      <ReceiptFilterForm filters={filters} trucks={trucks ?? []} drivers={drivers ?? []} />
      <div className="space-y-2 md:hidden">
        {(receipts ?? []).map((receipt) => (
          <Card key={receipt.id} className="flex gap-3">
            <ReceiptThumb receiptId={receipt.id} alt={receipt.merchant_name ?? "Receipt"} />
            <Link href={`/manage/receipts/${receipt.id}`} className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{receipt.merchant_name ?? "—"}</p>
                <ReceiptStatusBadge status={receipt.status} compact />
              </div>
              <p className="text-sm">Unit {(receipt.trucks as { unit_number?: string } | null)?.unit_number ?? "—"}</p>
              <p className="text-sm text-muted">
                {formatShortDate(receipt.purchased_at)} · {formatGallons(receipt.gallons == null ? null : Number(receipt.gallons), 3)} ·{" "}
                {formatUsd(receipt.total_amount == null ? null : Number(receipt.total_amount))}
              </p>
              {isLowOcrConfidence(receipt.ocr_confidence == null ? null : Number(receipt.ocr_confidence)) ? (
                <p className="text-sm text-alert">{ocrConfidenceLabel(Number(receipt.ocr_confidence))}</p>
              ) : null}
            </Link>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-steel/30 text-muted">
              <th className="px-3 py-3 font-medium">Image</th>
              <th className="px-3 py-3 font-medium">Merchant</th>
              <th className="px-3 py-3 font-medium">Truck</th>
              <th className="px-3 py-3 font-medium">
                <Link href={receiptCenterQuery(filters, { sort: "purchased_at", dir: filters.dir === "asc" ? "desc" : "asc", page: 1 })}>
                  Date
                </Link>
              </th>
              <th className="px-3 py-3 font-medium">Driver</th>
              <th className="px-3 py-3 font-medium">City / State</th>
              <th className="px-3 py-3 font-medium">
                <Link href={receiptCenterQuery(filters, { sort: "gallons", dir: filters.dir === "asc" ? "desc" : "asc", page: 1 })}>
                  Gallons
                </Link>
              </th>
              <th className="px-3 py-3 font-medium">Price/gal</th>
              <th className="px-3 py-3 font-medium">
                <Link href={receiptCenterQuery(filters, { sort: "total_amount", dir: filters.dir === "asc" ? "desc" : "asc", page: 1 })}>
                  Total
                </Link>
              </th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Report</th>
            </tr>
          </thead>
          <tbody>
            {(receipts ?? []).map((receipt) => (
              <tr key={receipt.id} className="h-[76px] border-b border-steel/20 last:border-b-0 hover:bg-warm/70">
                <td className="px-3 py-2">
                  <ReceiptThumb
                    receiptId={receipt.id}
                    alt={receipt.merchant_name ?? "Receipt"}
                    className="h-20 w-14 bg-warm object-cover"
                  />
                </td>
                <td className="px-3 py-2">
                  <Link className="font-semibold text-ink hover:text-route" href={`/manage/receipts/${receipt.id}`}>
                    {receipt.merchant_name ?? "—"}
                  </Link>
                </td>
                <td className="px-3 py-2 font-medium">{(receipt.trucks as { unit_number?: string } | null)?.unit_number ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums text-muted">{formatShortDate(receipt.purchased_at)}</td>
                <td className="px-3 py-2">{(receipt.profiles as { full_name?: string } | null)?.full_name ?? "—"}</td>
                <td className="px-3 py-2 text-muted">{formatCityState(receipt.merchant_city, receipt.merchant_region)}</td>
                <td className="px-3 py-2 tabular-nums">{formatGallons(receipt.gallons == null ? null : Number(receipt.gallons), 3)}</td>
                <td className="px-3 py-2 tabular-nums">
                  {formatPricePerGallon(receipt.price_per_gallon == null ? null : Number(receipt.price_per_gallon))}
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">
                  {formatUsd(receipt.total_amount == null ? null : Number(receipt.total_amount))}
                </td>
                <td className="px-3 py-2">
                  <ReceiptStatusBadge status={receipt.status} compact />
                  {receipt.status === "rejected" ? (
                    <p className="mt-1 text-xs text-muted">
                      {formatShortDate(receipt.rejected_at)} · {(receipt.rejector as { full_name?: string } | null)?.full_name ?? "Manager"}
                    </p>
                  ) : receipt.verified_at ? (
                    <p className="mt-1 text-xs text-muted">
                      {formatShortDate(receipt.verified_at)} · {(receipt.reviewer as { full_name?: string } | null)?.full_name ?? "Manager"}
                    </p>
                  ) : null}
                  {isLowOcrConfidence(receipt.ocr_confidence == null ? null : Number(receipt.ocr_confidence)) ? (
                    <p className="mt-1 text-xs text-alert">{ocrConfidenceLabel(Number(receipt.ocr_confidence))}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-muted">
                  {receipt.last_reported_at ? "Rpt" : "—"}
                  {receipt.amended_at ? " · Amd" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {(receipts ?? []).length === 0 ? <Card>No receipts match these filters.</Card> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={receiptCenterQuery(filters, { page: page - 1 })}>Previous</Link>
            </Button>
          ) : null}
          {page < pages ? (
            <Button asChild variant="outline">
              <Link href={receiptCenterQuery(filters, { page: page + 1 })}>Next</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
