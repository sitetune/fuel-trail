import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReceiptStatusBadge } from "@/components/receipts/status-badge";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { driverCanEditReceipt, driverCanReplaceImage } from "@/lib/receipts/states";
import { formatPricePerGallon, formatReceiptDate } from "@/lib/receipts/format";
import { formatGallons, formatUsd } from "@/lib/utils";
import type { ReceiptStatus } from "@/types/domain";

export default async function DriverReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number), rejector:profiles!rejected_by(full_name)")
    .eq("id", id)
    .single();
  if (!receipt || receipt.driver_id !== user.authUserId) notFound();
  const { data: events } = await supabase
    .from("receipt_audit_events")
    .select("*")
    .eq("receipt_id", id)
    .order("created_at", { ascending: true });
  const status = receipt.status as ReceiptStatus;
  const canEdit = driverCanEditReceipt(status);
  const canReplace = driverCanReplaceImage(status);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-semibold">{receipt.merchant_name ?? "Receipt"}</h1>
        <ReceiptStatusBadge status={receipt.status} />
      </div>
      {status === "rejected" ? (
        <Card className="border-alert bg-alert/5 space-y-2">
          <p className="font-semibold text-alert">Rejected — Action Required</p>
          <p className="text-sm">{receipt.rejection_reason ?? "A manager asked you to correct this receipt."}</p>
          <p className="text-sm text-muted">
            {formatReceiptDate(receipt.rejected_at)}
            {(receipt.rejector as { full_name?: string } | null)?.full_name
              ? ` · ${(receipt.rejector as { full_name?: string }).full_name}`
              : ""}
          </p>
        </Card>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/receipts/${receipt.id}/image`} alt="Stored receipt" className="max-h-72 w-full object-contain" />
      <Card className="space-y-1 text-sm">
        <p>Truck {(receipt.trucks as { unit_number?: string } | null)?.unit_number}</p>
        <p>Date {formatReceiptDate(receipt.purchased_at)}</p>
        <p>
          {receipt.merchant_city} {receipt.merchant_region}
        </p>
        <p>
          {formatGallons(receipt.gallons == null ? null : Number(receipt.gallons), 3)} ·{" "}
          {formatPricePerGallon(receipt.price_per_gallon == null ? null : Number(receipt.price_per_gallon))} ·{" "}
          {formatUsd(receipt.total_amount == null ? null : Number(receipt.total_amount))}
        </p>
        <p>Report status: {receipt.last_reported_at ? "Included in a report" : "Not yet reported"}</p>
      </Card>
      {canEdit ? (
        <div className="flex flex-col gap-2">
          <Button asChild variant="primary" className="w-full">
            <Link href={`/driver/receipts/${receipt.id}/review`}>Correct information</Link>
          </Button>
          {canReplace ? (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/driver/receipts/${receipt.id}/replace`}>Replace receipt image</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">Verified receipts can only be changed by a manager.</p>
      )}
      <Card>
        <h2 className="font-semibold">Review history</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {(events ?? []).map((event) => (
            <li key={event.id}>
              {String(event.event_type).replaceAll("_", " ")} · {formatReceiptDate(event.created_at)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
