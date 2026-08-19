import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";

export default async function InternalHomePage() {
  await requirePlatformAdmin();
  const admin = createServiceRoleClient();
  const { data: orgs } = await admin.from("organizations").select("id, name, slug, status, created_at").order("created_at", { ascending: false });
  const orgIds = (orgs ?? []).map((org) => org.id as string);
  const [{ data: profiles }, { data: receipts }, { data: imports }] = await Promise.all([
    admin.from("profiles").select("organization_id").in("organization_id", orgIds.length ? orgIds : ["00000000-0000-0000-0000-000000000000"]),
    admin.from("fuel_receipts").select("organization_id, status").in("organization_id", orgIds.length ? orgIds : ["00000000-0000-0000-0000-000000000000"]),
    admin.from("import_jobs").select("organization_id, status").eq("status", "failed"),
  ]);
  const userCounts = new Map<string, number>();
  for (const row of profiles ?? []) {
    const id = row.organization_id as string;
    userCounts.set(id, (userCounts.get(id) ?? 0) + 1);
  }
  const receiptCounts = new Map<string, number>();
  for (const row of receipts ?? []) {
    const id = row.organization_id as string;
    receiptCounts.set(id, (receiptCounts.get(id) ?? 0) + 1);
  }
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">FuelTrail admin</h1>
      <p className="text-sm text-[#5E6B75]">
        Platform view only. There is no silent impersonation. Support access is time-limited and audited.
      </p>
      {(orgs ?? []).map((org) => (
        <Link key={org.id} href={`/internal/orgs/${org.id}`}>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{org.name}</p>
              <p className="text-sm text-[#5E6B75]">
                {org.slug} · {userCounts.get(org.id) ?? 0} users · {receiptCounts.get(org.id) ?? 0} receipts
              </p>
            </div>
            <Badge tone={org.status === "active" ? "success" : org.status === "deactivated" ? "alert" : "amber"}>
              {org.status ?? "active"}
            </Badge>
          </Card>
        </Link>
      ))}
      {(imports ?? []).length ? (
        <p className="text-sm text-[#C93C37]">{imports?.length} failed import job(s) across tenants.</p>
      ) : null}
    </div>
  );
}
