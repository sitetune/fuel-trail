import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/receipts/print-button";
import { ReceiptPrintDocument } from "@/components/receipts/receipt-print-document";
import { Card } from "@/components/ui/card";

const BATCH_LIMIT = 25;

export default async function BatchPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  await requireManagement();
  const params = await searchParams;
  const ids = (params.ids ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, BATCH_LIMIT);
  if (ids.length === 0) {
    return <Card>Select receipts in Receipt Center first.</Card>;
  }
  const supabase = await createServerSupabaseClient();
  const { data: receipts } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number, vin), profiles:driver_id(full_name), reviewer:profiles!verified_by(full_name)")
    .in("id", ids);
  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { max-width: none; padding: 0; }
          .receipt-print-page { break-after: page; }
        }
      `}</style>
      <p className="no-print text-sm text-muted">
        Printing {ids.length} receipt{ids.length === 1 ? "" : "s"} (limit {BATCH_LIMIT}). Use your browser print dialog to save PDF.
      </p>
      <div className="no-print">
        <PrintButton />
      </div>
      {(receipts ?? []).map((receipt) => (
        <ReceiptPrintDocument key={receipt.id} receipt={receipt} />
      ))}
    </div>
  );
}
