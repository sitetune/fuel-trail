import Link from "next/link";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ReceiptStatusBadge } from "@/components/receipts/status-badge";
import { ReceiptThumb } from "@/components/receipts/receipt-thumb";
import {
  RECEIPT_PAGE_SIZE,
  parseReceiptCenterFilters,
  receiptCenterQuery,
  receiptSearchOrFilter,
} from "@/lib/receipts/list";
import { formatPricePerGallon, formatReceiptDate, ocrConfidenceLabel } from "@/lib/receipts/format";
import { isLowOcrConfidence, receiptStatusLabel } from "@/lib/receipts/states";
import { formatGallons, formatUsd } from "@/lib/utils";
import { RECEIPT_STATUSES } from "@/types/domain";
import { ReceiptBatchBar } from "@/components/receipts/receipt-batch-bar";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Receipt Center</h1>
          <p className="text-sm text-muted">{total} receipt{total === 1 ? "" : "s"}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/manage/receipts">Clear filters</Link>
        </Button>
      </div>
      <Card>
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <div className="md:col-span-2">
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Merchant, city, or receipt #" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue={filters.status ?? ""} className="h-11 w-full rounded-md border px-3">
              <option value="">All</option>
              {RECEIPT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {receiptStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="truckId">Truck</Label>
            <select id="truckId" name="truckId" defaultValue={filters.truckId ?? ""} className="h-11 w-full rounded-md border px-3">
              <option value="">All</option>
              {(trucks ?? []).map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.unit_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="driverId">Driver</Label>
            <select id="driverId" name="driverId" defaultValue={filters.driverId ?? ""} className="h-11 w-full rounded-md border px-3">
              <option value="">All</option>
              {(drivers ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="region">State</Label>
            <Input id="region" name="region" maxLength={2} defaultValue={filters.region ?? ""} placeholder="TX" />
          </div>
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" type="date" defaultValue={filters.from ?? ""} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" defaultValue={filters.to ?? ""} />
          </div>
          <div>
            <Label htmlFor="ocr">OCR</Label>
            <select id="ocr" name="ocr" defaultValue={filters.ocr ?? ""} className="h-11 w-full rounded-md border px-3">
              <option value="">Any</option>
              <option value="low">Low confidence</option>
              <option value="ok">OK</option>
            </select>
          </div>
          <div>
            <Label htmlFor="report">Report</Label>
            <select id="report" name="report" defaultValue={filters.report ?? ""} className="h-11 w-full rounded-md border px-3">
              <option value="">Any</option>
              <option value="unreported">Unreported</option>
              <option value="reported">Included in a report</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="primary" className="w-full">
              Apply
            </Button>
          </div>
        </form>
      </Card>
      <ReceiptBatchBar
        receipts={(receipts ?? []).map((receipt) => ({
          id: receipt.id,
          label: `${(receipt.trucks as { unit_number?: string } | null)?.unit_number ?? "Unit"} · ${receipt.merchant_name ?? "Receipt"} · ${receipt.status}`,
        }))}
      />
      <div className="space-y-2 md:hidden">
        {(receipts ?? []).map((receipt) => (
          <Card key={receipt.id} className="flex gap-3">
            <ReceiptThumb receiptId={receipt.id} alt={receipt.merchant_name ?? "Receipt"} />
            <Link href={`/manage/receipts/${receipt.id}`} className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">Unit {(receipt.trucks as { unit_number?: string } | null)?.unit_number}</p>
                <ReceiptStatusBadge status={receipt.status} />
              </div>
              <p className="text-sm">{receipt.merchant_name ?? "—"}</p>
              <p className="text-sm text-muted">
                {formatReceiptDate(receipt.purchased_at)} · {formatGallons(receipt.gallons == null ? null : Number(receipt.gallons), 3)} ·{" "}
                {formatUsd(receipt.total_amount == null ? null : Number(receipt.total_amount))}
              </p>
              {isLowOcrConfidence(receipt.ocr_confidence == null ? null : Number(receipt.ocr_confidence)) ? (
                <p className="text-sm text-alert">{ocrConfidenceLabel(Number(receipt.ocr_confidence))}</p>
              ) : null}
            </Link>
          </Card>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b text-muted">
              <th className="py-2">Image</th>
              <th>
                <Link href={receiptCenterQuery(filters, { sort: "purchased_at", dir: filters.dir === "asc" ? "desc" : "asc", page: 1 })}>
                  Transaction
                </Link>
              </th>
              <th>Submitted</th>
              <th>Driver</th>
              <th>Truck</th>
              <th>Merchant</th>
              <th>City / State</th>
              <th>
                <Link href={receiptCenterQuery(filters, { sort: "gallons", dir: filters.dir === "asc" ? "desc" : "asc", page: 1 })}>
                  Gallons
                </Link>
              </th>
              <th>Price/gal</th>
              <th>
                <Link href={receiptCenterQuery(filters, { sort: "total_amount", dir: filters.dir === "asc" ? "desc" : "asc", page: 1 })}>
                  Total
                </Link>
              </th>
              <th>Status</th>
              <th>Reviewed</th>
              <th>Report</th>
            </tr>
          </thead>
          <tbody>
            {(receipts ?? []).map((receipt) => (
              <tr key={receipt.id} className="border-b align-top">
                <td className="py-2">
                  <ReceiptThumb receiptId={receipt.id} alt={receipt.merchant_name ?? "Receipt"} />
                </td>
                <td className="py-2">
                  <Link className="font-medium underline" href={`/manage/receipts/${receipt.id}`}>
                    {formatReceiptDate(receipt.purchased_at)}
                  </Link>
                </td>
                <td className="py-2">{formatReceiptDate(receipt.submitted_at)}</td>
                <td className="py-2">{(receipt.profiles as { full_name?: string } | null)?.full_name ?? "—"}</td>
                <td className="py-2">{(receipt.trucks as { unit_number?: string } | null)?.unit_number ?? "—"}</td>
                <td className="py-2">{receipt.merchant_name ?? "—"}</td>
                <td className="py-2">
                  {[receipt.merchant_city, receipt.merchant_region].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="py-2">{formatGallons(receipt.gallons == null ? null : Number(receipt.gallons), 3)}</td>
                <td className="py-2">
                  {formatPricePerGallon(receipt.price_per_gallon == null ? null : Number(receipt.price_per_gallon))}
                </td>
                <td className="py-2">{formatUsd(receipt.total_amount == null ? null : Number(receipt.total_amount))}</td>
                <td className="py-2">
                  <ReceiptStatusBadge status={receipt.status} />
                  {isLowOcrConfidence(receipt.ocr_confidence == null ? null : Number(receipt.ocr_confidence)) ? (
                    <p className="mt-1 text-xs text-alert">{ocrConfidenceLabel(Number(receipt.ocr_confidence))}</p>
                  ) : null}
                </td>
                <td className="py-2">
                  {receipt.status === "rejected"
                    ? `${formatReceiptDate(receipt.rejected_at)} · ${(receipt.rejector as { full_name?: string } | null)?.full_name ?? "Manager"}`
                    : receipt.verified_at
                      ? `${formatReceiptDate(receipt.verified_at)} · ${(receipt.reviewer as { full_name?: string } | null)?.full_name ?? "Manager"}`
                      : "—"}
                </td>
                <td className="py-2">
                  {receipt.last_reported_at ? "Included" : "Unreported"}
                  {receipt.amended_at ? " · Amended" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
