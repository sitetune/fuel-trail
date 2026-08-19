import { notFound } from "next/navigation";
import { ReplaceReceiptImage } from "@/components/driver/replace-receipt-image";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { driverCanReplaceImage } from "@/lib/receipts/states";
import type { ReceiptStatus } from "@/types/domain";

export default async function ReplaceReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase.from("fuel_receipts").select("id, driver_id, status").eq("id", id).single();
  if (!receipt || receipt.driver_id !== user.authUserId) notFound();
  if (!driverCanReplaceImage(receipt.status as ReceiptStatus)) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Replace receipt image</h1>
      <ReplaceReceiptImage receiptId={id} />
    </div>
  );
}
