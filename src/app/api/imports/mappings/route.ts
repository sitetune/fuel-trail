import { z } from "zod";
import { AuthError, requireManagement, requireWriteManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FLEET_IMPORT_KINDS } from "@/lib/imports/fleet";

const saveSchema = z.object({
  kind: z.enum(FLEET_IMPORT_KINDS),
  name: z.string().trim().min(1).max(80),
  mapping: z.record(z.string(), z.string()),
});

export async function GET(request: Request) {
  try {
    const user = await requireManagement();
    const kind = new URL(request.url).searchParams.get("kind");
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("import_column_mappings")
      .select("id, kind, name, mapping, created_at")
      .eq("organization_id", user.organization.id)
      .order("name");
    if (kind) query = query.eq("kind", kind);
    const { data } = await query;
    return apiOk({ mappings: data ?? [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "mapping_failed", "Could not load saved mappings.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireWriteManagement();
    const body = saveSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("import_column_mappings")
      .upsert(
        {
          organization_id: user.organization.id,
          kind: body.kind,
          name: body.name,
          mapping: body.mapping,
          created_by: user.authUserId,
        },
        { onConflict: "organization_id,kind,name" },
      )
      .select("id, kind, name, mapping")
      .single();
    if (error || !data) return apiError(400, "mapping_failed", "Could not save mapping.");
    await supabase.from("app_audit_events").insert({
      organization_id: user.organization.id,
      actor_id: user.authUserId,
      entity_type: "import_mapping",
      entity_id: data.id,
      event_type: "import_mapping_saved",
      metadata: { kind: body.kind, name: body.name },
    });
    return apiOk({ mapping: data }, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "mapping_failed", "Could not save mapping.");
  }
}
