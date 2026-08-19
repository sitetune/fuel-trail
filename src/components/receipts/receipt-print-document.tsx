import { receiptStatusLabel } from "@/lib/receipts/states";
import { formatPricePerGallon, formatReceiptDate } from "@/lib/receipts/format";
import { formatGallons, formatUsd } from "@/lib/utils";

export type PrintableReceipt = {
  id: string;
  status: string;
  merchant_name: string | null;
  purchased_at: string | null;
  gallons: number | null;
  price_per_gallon: number | null;
  total_amount: number | null;
  merchant_region: string | null;
  receipt_number: string | null;
  verified_at: string | null;
  duplicate_of: string | null;
  duplicate_override: boolean | null;
  trucks: { unit_number?: string } | null;
  profiles: { full_name?: string } | null;
  reviewer: { full_name?: string } | null;
  events?: Array<{ event_type: string; created_at: string }>;
};

export function receiptWatermark(receipt: PrintableReceipt) {
  if (receipt.status === "verified") return "Verified";
  if (receipt.status === "rejected") return "Rejected";
  if (receipt.duplicate_of && !receipt.duplicate_override) return "Duplicate";
  return "Unverified";
}

export function ReceiptPrintDocument({ receipt }: { receipt: PrintableReceipt }) {
  const watermark = receiptWatermark(receipt);
  return (
    <article className="receipt-print-page space-y-6 break-after-page bg-white p-6">
      <header className="relative border-b pb-4">
        <p className="text-sm text-[#5E6B75]">FuelTrail receipt record</p>
        <h1 className="text-2xl font-semibold">
          Unit {receipt.trucks?.unit_number} · {receipt.merchant_name}
        </h1>
        <p>
          Driver {receipt.profiles?.full_name ?? "—"} · {formatReceiptDate(receipt.purchased_at)}
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
                ? `${formatReceiptDate(receipt.verified_at)} · ${receipt.reviewer?.full_name ?? ""}`
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>
      {receipt.events?.length ? (
        <section>
          <h2 className="font-semibold">Audit summary</h2>
          <ul className="mt-2 text-sm">
            {receipt.events.map((event) => (
              <li key={`${event.event_type}-${event.created_at}`}>
                {event.event_type.replaceAll("_", " ")} · {formatReceiptDate(event.created_at)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
