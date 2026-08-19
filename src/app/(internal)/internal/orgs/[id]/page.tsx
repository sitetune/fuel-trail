import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { grantSupportAccessAction, setOrganizationStatusAction } from "../../actions";

export default async function InternalOrgPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ granted?: string; error?: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const query = await searchParams;
  const admin = createServiceRoleClient();
  const { data: org } = await admin.from("organizations").select("*").eq("id", id).single();
  if (!org) notFound();
  const [{ count: users }, { count: receipts }, { count: failedImports }, { count: failedNotes }, { data: grants }] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", id),
      admin.from("fuel_receipts").select("*", { count: "exact", head: true }).eq("organization_id", id),
      admin.from("import_jobs").select("*", { count: "exact", head: true }).eq("organization_id", id).eq("status", "failed"),
      admin.from("notifications").select("*", { count: "exact", head: true }).eq("organization_id", id).eq("event_type", "notification_failed"),
      admin.from("support_access_grants").select("*").eq("organization_id", id).order("created_at", { ascending: false }).limit(5),
    ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{org.name}</h1>
        <p className="text-sm text-[#5E6B75]">
          Status {org.status ?? "active"} · {users ?? 0} users · {receipts ?? 0} receipts
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-[#5E6B75]">Failed imports</p>
          <p className="text-2xl font-semibold">{failedImports ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#5E6B75]">Notification failures</p>
          <p className="text-2xl font-semibold">{failedNotes ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#5E6B75]">Created</p>
          <p className="text-2xl font-semibold">{new Date(org.created_at).toLocaleDateString()}</p>
        </Card>
      </div>
      <Card className="space-y-3">
        <h2 className="font-semibold">Activation</h2>
        <form action={setOrganizationStatusAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="organizationId" value={org.id} />
          <select name="status" className="h-11 rounded-md border px-3" defaultValue={org.status ?? "active"}>
            <option value="active">active</option>
            <option value="pending_activation">pending_activation</option>
            <option value="deactivated">deactivated</option>
          </select>
          <Button type="submit">Save status</Button>
        </form>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Time-limited support access</h2>
        <p className="text-sm text-[#5E6B75]">
          This records that you reviewed tenant metadata. It does not sign you in as a customer user.
        </p>
        {query.error === "reason" ? <p className="text-[#C93C37]">Enter a reason of at least 8 characters.</p> : null}
        {query.granted ? <p className="text-[#198754]">Support access recorded.</p> : null}
        <form action={grantSupportAccessAction} className="space-y-3">
          <input type="hidden" name="organizationId" value={org.id} />
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" name="reason" required minLength={8} placeholder="Pilot onboarding help" />
          <Label htmlFor="hours">Hours</Label>
          <Input id="hours" name="hours" type="number" min={1} max={24} defaultValue={4} />
          <Button type="submit" variant="outline">
            Record support access
          </Button>
        </form>
        <ul className="text-sm text-[#5E6B75]">
          {(grants ?? []).map((grant) => (
            <li key={grant.id}>
              {grant.actor_email} · {grant.reason} · until {new Date(grant.ends_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
