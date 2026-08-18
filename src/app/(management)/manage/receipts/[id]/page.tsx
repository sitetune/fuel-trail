import { notFound } from "next/navigation";
import { ReceiptManager } from "@/components/management/receipt-manager";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagement();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number)")
    .eq("id", id)
    .single();
  if (!receipt) notFound();
  const { data: events } = await supabase
    .from("receipt_audit_events")
    .select("*")
    .eq("receipt_id", id)
    .order("created_at", { ascending: true });
  return <ReceiptManager receipt={receipt} events={events ?? []} />;
}
