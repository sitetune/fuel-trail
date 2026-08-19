import { UsersManager } from "@/components/management/users-manager";
import { CsvTemplateDownloads } from "@/components/management/csv-template-downloads";
import { Button } from "@/components/ui/button";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireManagement();
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: users } = await supabase.from("profiles").select("*").order("full_name");
  const { data: trucks } = await supabase.from("trucks").select("id, unit_number").eq("status", "active");
  const { data: assignments } = await supabase
    .from("driver_truck_assignments")
    .select("driver_id, truck_id, trucks(unit_number)")
    .is("ends_at", null);
  const { data: receiptCounts } = await supabase.from("fuel_receipts").select("driver_id");
  const counts = new Map<string, number>();
  for (const row of receiptCounts ?? []) {
    const driverId = row.driver_id as string;
    counts.set(driverId, (counts.get(driverId) ?? 0) + 1);
  }
  const assignmentByDriver = new Map(
    (assignments ?? []).map((row) => [
      row.driver_id as string,
      {
        truckId: row.truck_id as string,
        unit: (row.trucks as { unit_number?: string } | null)?.unit_number ?? null,
      },
    ]),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Users</h1>
          <p className="text-sm text-[#5E6B75]">Invite one person, or import a driver CSV from Import Center.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/manage/import">Import drivers CSV</Link>
        </Button>
      </div>
      <CsvTemplateDownloads kinds={["drivers", "assignments"]} />
      <UsersManager
      users={(users ?? []).map((person) => ({
        id: person.id,
        full_name: person.full_name,
        email: person.email,
        phone: person.phone,
        role: person.role,
        is_active: person.is_active,
        last_seen_at: person.last_seen_at,
        assigned_unit: assignmentByDriver.get(person.id)?.unit ?? null,
        assigned_truck_id: assignmentByDriver.get(person.id)?.truckId ?? null,
        receipt_count: counts.get(person.id) ?? 0,
      }))}
      trucks={trucks ?? []}
      canInvite={user.profile.role === "owner_admin"}
      canAssign={user.profile.role === "owner_admin" || user.profile.role === "manager"}
      error={params.error === "last-owner" ? "Cannot deactivate or demote the last active owner." : undefined}
    />
    </div>
  );
}
