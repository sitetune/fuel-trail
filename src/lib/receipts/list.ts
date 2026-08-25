import type { ReceiptStatus } from "@/types/domain";

export type ReceiptCenterFilters = {
  status?: string;
  truckId?: string;
  driverId?: string;
  merchant?: string;
  region?: string;
  q?: string;
  from?: string;
  to?: string;
  ocr?: "low" | "ok";
  report?: "reported" | "unreported";
  sort?: "purchased_at" | "submitted_at" | "total_amount" | "gallons" | "status";
  dir?: "asc" | "desc";
  page?: number;
};

export const RECEIPT_PAGE_SIZE = 25;

export function receiptFiltersAreActive(filters: ReceiptCenterFilters) {
  return Boolean(
    filters.status ||
      filters.truckId ||
      filters.driverId ||
      filters.merchant ||
      filters.region ||
      filters.q ||
      filters.from ||
      filters.to ||
      filters.ocr ||
      filters.report,
  );
}

const SORTS = new Set(["purchased_at", "submitted_at", "total_amount", "gallons", "status"]);

export function parseReceiptCenterFilters(params: Record<string, string | undefined>): ReceiptCenterFilters {
  const sort = params.sort && SORTS.has(params.sort) ? (params.sort as ReceiptCenterFilters["sort"]) : "purchased_at";
  const page = Math.max(1, Number(params.page || "1") || 1);
  return {
    status: params.status || undefined,
    truckId: params.truckId || undefined,
    driverId: params.driverId || undefined,
    merchant: params.merchant || undefined,
    region: params.region?.toUpperCase() || undefined,
    q: params.q?.trim() || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    ocr: params.ocr === "low" || params.ocr === "ok" ? params.ocr : undefined,
    report: params.report === "reported" || params.report === "unreported" ? params.report : undefined,
    sort,
    dir: params.dir === "asc" ? "asc" : "desc",
    page,
  };
}

export function receiptSearchOrFilter(q: string) {
  const safe = q.replace(/[%_,]/g, " ").trim();
  if (!safe) return null;
  return `merchant_name.ilike.%${safe}%,receipt_number.ilike.%${safe}%,merchant_city.ilike.%${safe}%`;
}

export function receiptCenterQuery(filters: ReceiptCenterFilters, patch: Partial<ReceiptCenterFilters> = {}) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.truckId) params.set("truckId", next.truckId);
  if (next.driverId) params.set("driverId", next.driverId);
  if (next.merchant) params.set("merchant", next.merchant);
  if (next.region) params.set("region", next.region);
  if (next.q) params.set("q", next.q);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.ocr) params.set("ocr", next.ocr);
  if (next.report) params.set("report", next.report);
  if (next.sort && next.sort !== "purchased_at") params.set("sort", next.sort);
  if (next.dir && next.dir !== "desc") params.set("dir", next.dir);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/manage/receipts?${query}` : "/manage/receipts";
}

export function isReceiptStatus(value: string | undefined): value is ReceiptStatus {
  return (
    value === "draft" ||
    value === "processing" ||
    value === "needs_review" ||
    value === "submitted" ||
    value === "verified" ||
    value === "rejected" ||
    value === "archived"
  );
}
