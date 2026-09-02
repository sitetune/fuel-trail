import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { assertPlanAllows, PlanLimitError } from "@/lib/billing/assert";
import { toCsv } from "@/lib/reports/csv";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await requireManagement();
    assertPlanAllows(user.organization, "audit_exports");
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const entityType = url.searchParams.get("entityType") ?? "";
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("app_audit_events")
      .select("id, actor_id, entity_type, entity_id, event_type, metadata, created_at, profiles:actor_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(1000);
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
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fueltrail-audit-log.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return apiError(403, error.code, error.message);
    }
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "export_failed", "Could not export the audit log.");
  }
}
