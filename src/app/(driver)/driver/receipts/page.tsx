import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReceiptStatusBadge } from "@/components/receipts/status-badge";
import { ReceiptThumb } from "@/components/receipts/receipt-thumb";
import { formatReceiptDate } from "@/lib/receipts/format";
import { formatGallons, formatUsd } from "@/lib/utils";

export default async function DriverReceiptsPage() {
  const user = await requireSession();
  const supabase = await createServerSupabaseClient();
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("id, status, purchased_at, merchant_name, merchant_city, merchant_region, gallons, total_amount, rejection_reason, rejected_at, trucks(unit_number)")
    .eq("driver_id", user.authUserId)
    .order("created_at", { ascending: false })
    .limit(100);
  const actionRequired = (receipts ?? []).filter((row) => row.status === "rejected");
  const rest = (receipts ?? []).filter((row) => row.status !== "rejected");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Receipts</h1>
          <p className="text-sm text-muted">Your submission history</p>
        </div>
        <Button asChild variant="primary">
          <Link href="/driver/receipts/new">Add receipt</Link>
        </Button>
      </div>
      {actionRequired.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-alert">Rejected — Action Required</h2>
          {actionRequired.map((receipt) => (
            <DriverReceiptCard key={receipt.id} receipt={receipt} />
          ))}
        </section>
      ) : null}
      <section className="space-y-2">
        {rest.map((receipt) => (
          <DriverReceiptCard key={receipt.id} receipt={receipt} />
        ))}
        {(receipts ?? []).length === 0 ? <Card>No receipts yet. Add one after you fuel.</Card> : null}
      </section>
    </div>
  );
}

function DriverReceiptCard({
  receipt,
}: {
  receipt: {
    id: string;
    status: string;
    purchased_at: string | null;
    merchant_name: string | null;
    merchant_city: string | null;
    merchant_region: string | null;
    gallons: number | null;
    total_amount: number | null;
    rejection_reason: string | null;
    rejected_at: string | null;
    trucks: { unit_number: string } | { unit_number: string }[] | null;
  };
}) {
  const truck = Array.isArray(receipt.trucks) ? receipt.trucks[0] : receipt.trucks;
  return (
    <Card className="flex gap-3">
      <ReceiptThumb receiptId={receipt.id} alt={receipt.merchant_name ?? "Receipt"} />
      <Link href={`/driver/receipts/${receipt.id}`} className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{receipt.merchant_name ?? "Draft"}</p>
          <ReceiptStatusBadge status={receipt.status} />
        </div>
        <p className="text-sm text-muted">
          Unit {truck?.unit_number ?? "—"} · {formatReceiptDate(receipt.purchased_at)}
        </p>
        <p className="text-sm">
          {formatGallons(receipt.gallons == null ? null : Number(receipt.gallons), 3)} ·{" "}
          {formatUsd(receipt.total_amount == null ? null : Number(receipt.total_amount))}
        </p>
        {receipt.status === "rejected" && receipt.rejection_reason ? (
          <p className="mt-1 text-sm text-alert">{receipt.rejection_reason}</p>
        ) : null}
      </Link>
    </Card>
  );
}
