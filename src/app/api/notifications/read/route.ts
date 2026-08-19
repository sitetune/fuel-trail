import { z } from "zod";
import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.authUserId)
      .is("read_at", null);
    if (body.ids?.length) query = query.in("id", body.ids);
    else if (!body.all && !body.ids) {
      return apiError(400, "invalid_input", "Specify notification ids or all.");
    }
    const { error } = await query;
    if (error) return apiError(400, "update_failed", "Could not mark notifications read.");
    return apiOk({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "update_failed", "Could not mark notifications read.");
  }
}
