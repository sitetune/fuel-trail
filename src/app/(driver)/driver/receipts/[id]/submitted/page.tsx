import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: receipt } = await supabase
    .from("fuel_receipts")
    .select("gallons, trucks(unit_number), status")
    .eq("id", id)
    .single();
  if (!receipt) notFound();
  return (
    <Card className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Receipt submitted</h1>
      <p className="text-lg">
        Truck {(Array.isArray(receipt.trucks) ? receipt.trucks[0] : receipt.trucks)?.unit_number} · {receipt.gallons} gallons
      </p>
      <p className="text-sm text-[#5E6B75]">Status: {receipt.status.replace("_", " ")}</p>
      <Button asChild variant="amber" className="w-full">
        <Link href="/driver">Back home</Link>
      </Button>
    </Card>
  );
}
