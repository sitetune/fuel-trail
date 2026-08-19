import { notFound } from "next/navigation";
import { ReceiptWorkspace } from "@/components/management/receipt-workspace";
import { canVerifyReceipts } from "@/lib/auth/roles";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireManagement();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number), profiles:driver_id(full_name)")
    .eq("id", id)
    .single();
  if (!receipt) notFound();
  const [{ data: events }, { data: trucks }, { data: drivers }] = await Promise.all([
    supabase.from("receipt_audit_events").select("*").eq("receipt_id", id).order("created_at", { ascending: true }),
    supabase.from("trucks").select("id, unit_number").order("unit_number"),
    supabase.from("profiles").select("id, full_name").eq("role", "driver").eq("is_active", true).order("full_name"),
  ]);
  return (
    <ReceiptWorkspace
      receipt={receipt as never}
      events={events ?? []}
      trucks={trucks ?? []}
      drivers={drivers ?? []}
      readOnly={!canVerifyReceipts(user.profile.role)}
    />
  );
}
