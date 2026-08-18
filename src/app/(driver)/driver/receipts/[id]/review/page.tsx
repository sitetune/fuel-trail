import { notFound } from "next/navigation";
import { ReceiptReviewForm } from "@/components/driver/receipt-review-form";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ReviewReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSession();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number)")
    .eq("id", id)
    .single();
  if (!receipt || receipt.driver_id !== user.authUserId) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Review receipt</h1>
      <ReceiptReviewForm
        receiptId={receipt.id}
        truckId={receipt.truck_id}
        truckUnit={(receipt.trucks as { unit_number: string }).unit_number}
        purchaserName={receipt.purchaser_name ?? user.profile.full_name}
        extraction={receipt.ocr_extracted_json as never}
      />
    </div>
  );
}
