import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toCsv } from "@/lib/reports/csv";
import Link from "next/link";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManagement();
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q : "";
  const entityType = typeof raw.entityType === "string" ? raw.entityType : "";
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("app_audit_events")
    .select("id, actor_id, entity_type, entity_id, event_type, metadata, created_at, profiles:actor_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (entityType) query = query.eq("entity_type", entityType);
  if (q) query = query.or(`event_type.ilike.%${q}%,entity_type.ilike.%${q}%`);
  const { data: events } = await query;
  const csv = toCsv(
    ["created_at", "actor", "event_type", "entity_type", "entity_id", "metadata"],
    (events ?? []).map((event) => [
      event.created_at,
      (event.profiles as { full_name?: string } | null)?.full_name ?? "",
      event.event_type,
      event.entity_type,
      event.entity_id,
      JSON.stringify(event.metadata ?? {}),
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Audit log</h1>
          <p className="text-sm text-[#5E6B75]">Append-only organization events. Receipt field changes also appear on each receipt.</p>
        </div>
        <Button asChild variant="outline">
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="fueltrail-audit-log.csv">
            Download CSV
          </a>
        </Button>
      </div>
      <Card>
        <form className="grid gap-3 md:grid-cols-3" method="get">
          <div>
            <Label htmlFor="q">Search</Label>
            <Input id="q" name="q" defaultValue={q} placeholder="event or entity" />
          </div>
          <div>
            <Label htmlFor="entityType">Entity type</Label>
            <Input id="entityType" name="entityType" defaultValue={entityType} placeholder="profile, truck, report_run" />
          </div>
          <div className="flex items-end">
            <Button type="submit">Filter</Button>
          </div>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((event) => {
              const href =
                event.entity_type === "fuel_receipt" && event.entity_id
                  ? `/manage/receipts/${event.entity_id}`
                  : event.entity_type === "truck" && event.entity_id
                    ? `/manage/trucks/${event.entity_id}`
                    : null;
              return (
                <tr key={event.id} className="border-b align-top">
                  <td className="py-2 whitespace-nowrap">{new Date(event.created_at).toLocaleString()}</td>
                  <td>{(event.profiles as { full_name?: string } | null)?.full_name ?? "System"}</td>
                  <td>{event.event_type.replaceAll("_", " ")}</td>
                  <td>
                    {href ? (
                      <Link className="underline" href={href}>
                        {event.entity_type}
                      </Link>
                    ) : (
                      event.entity_type
                    )}
                  </td>
                  <td>
                    <pre className="max-w-xl overflow-x-auto text-xs">{JSON.stringify(event.metadata ?? {}, null, 2)}</pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
