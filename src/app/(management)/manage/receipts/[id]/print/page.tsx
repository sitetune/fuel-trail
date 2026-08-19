import { notFound } from "next/navigation";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/receipts/print-button";
import { ReceiptPrintDocument } from "@/components/receipts/receipt-print-document";

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

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { max-width: none; padding: 0; }
        }
      `}</style>
      <ReceiptPrintDocument receipt={{ ...receipt, events: events ?? [] }} />
      <PrintButton />
    </div>
  );
}
