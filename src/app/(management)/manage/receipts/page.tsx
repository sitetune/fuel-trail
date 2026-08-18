import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ReceiptsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; truckId?: string }>;
}) {
  await requireManagement();
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("fuel_receipts")
    .select("*, trucks(unit_number), profiles:driver_id(full_name)")
    .order("created_at", { ascending: false });
  if (params.status) query = query.eq("status", params.status);
  if (params.truckId) query = query.eq("truck_id", params.truckId);
  const { data: receipts } = await query.limit(100);
  const tabs = ["needs_review", "submitted", "verified", "rejected", "draft"];
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Receipts</h1>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Link key={tab} href={`/manage/receipts?status=${tab}`} className="min-h-11 rounded-full bg-white px-3 py-2 text-sm">
            {tab.replace("_", " ")}
          </Link>
        ))}
      </div>
      <div className="space-y-2 md:hidden">
        {(receipts ?? []).map((receipt) => (
          <Link key={receipt.id} href={`/manage/receipts/${receipt.id}`}>
            <Card>
              <div className="flex justify-between">
                <p className="font-semibold">Unit {(receipt.trucks as { unit_number: string }).unit_number}</p>
                <Badge>{receipt.status}</Badge>
              </div>
              <p className="text-sm text-[#5E6B75]">
                {receipt.merchant_name} · {receipt.gallons} gal
                {receipt.duplicate_of && !receipt.duplicate_override ? " · duplicate warning" : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b text-[#5E6B75]">
              <th className="py-2">Truck</th>
              <th>Driver</th>
              <th>Merchant</th>
              <th>State</th>
              <th>Gallons</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(receipts ?? []).map((receipt) => (
              <tr key={receipt.id} className="border-b">
                <td className="py-3">
                  <Link className="underline" href={`/manage/receipts/${receipt.id}`}>
                    {(receipt.trucks as { unit_number: string }).unit_number}
                  </Link>
                </td>
                <td>{(receipt.profiles as { full_name?: string } | null)?.full_name}</td>
                <td>{receipt.merchant_name}</td>
                <td>{receipt.merchant_region}</td>
                <td>{receipt.gallons}</td>
                <td>{receipt.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
