import { notFound } from "next/navigation";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { receiptStatusLabel } from "@/lib/receipts/states";
import { formatPricePerGallon, formatReceiptDate } from "@/lib/receipts/format";
import { formatGallons, formatUsd } from "@/lib/utils";
import { PrintButton } from "@/components/receipts/print-button";

export default async function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagement();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number, vin), profiles:driver_id(full_name), reviewer:profiles!verified_by(full_name)")
    .eq("id", id)
    .single();
  if (!receipt) notFound();
  const { data: events } = await supabase
    .from("receipt_audit_events")
    .select("event_type, created_at")
    .eq("receipt_id", id)
    .order("created_at", { ascending: true });
  const watermark =
    receipt.status === "verified"
      ? "Verified"
      : receipt.status === "rejected"
        ? "Rejected"
        : receipt.duplicate_of && !receipt.duplicate_override
          ? "Duplicate"
          : "Unverified";

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { max-width: none; padding: 0; }
        }
      `}</style>
      <header className="relative border-b pb-4">
        <p className="text-sm text-[#5E6B75]">FuelTrail receipt record</p>
        <h1 className="text-2xl font-semibold">
          Unit {(receipt.trucks as { unit_number?: string } | null)?.unit_number} · {receipt.merchant_name}
        </h1>
        <p>
          Driver {(receipt.profiles as { full_name?: string } | null)?.full_name ?? "—"} ·{" "}
          {formatReceiptDate(receipt.purchased_at)}
        </p>
        <p className="absolute right-0 top-0 rotate-12 border-4 border-[#0B1F33] px-4 py-1 text-2xl font-black uppercase tracking-widest text-[#0B1F33]/40">
          {watermark}
        </p>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/receipts/${receipt.id}/image?original=1`} alt="Receipt" className="max-h-[480px] w-full object-contain" />
      <table className="w-full text-left text-sm">
        <tbody>
          <tr><th className="py-1 pr-4">Status</th><td>{receiptStatusLabel(receipt.status)}</td></tr>
          <tr><th className="py-1 pr-4">Gallons</th><td>{formatGallons(receipt.gallons == null ? null : Number(receipt.gallons), 3)}</td></tr>
          <tr><th className="py-1 pr-4">Price / gal</th><td>{formatPricePerGallon(receipt.price_per_gallon == null ? null : Number(receipt.price_per_gallon))}</td></tr>
          <tr><th className="py-1 pr-4">Total</th><td>{formatUsd(receipt.total_amount == null ? null : Number(receipt.total_amount))}</td></tr>
          <tr><th className="py-1 pr-4">Jurisdiction</th><td>{receipt.merchant_region ?? "—"}</td></tr>
          <tr><th className="py-1 pr-4">Receipt #</th><td>{receipt.receipt_number ?? "—"}</td></tr>
          <tr>
            <th className="py-1 pr-4">Verified</th>
            <td>
              {receipt.verified_at
                ? `${formatReceiptDate(receipt.verified_at)} · ${(receipt.reviewer as { full_name?: string } | null)?.full_name ?? ""}`
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>
      <section>
        <h2 className="font-semibold">Audit summary</h2>
        <ul className="mt-2 text-sm">
          {(events ?? []).map((event) => (
            <li key={`${event.event_type}-${event.created_at}`}>
              {event.event_type.replaceAll("_", " ")} · {formatReceiptDate(event.created_at)}
            </li>
          ))}
        </ul>
      </section>
      <PrintButton />
    </div>
  );
}
