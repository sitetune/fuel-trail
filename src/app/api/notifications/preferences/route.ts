import { z } from "zod";
import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { NOTIFICATION_EVENTS } from "@/lib/notifications/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  emailEvents: z.record(z.string(), z.boolean()),
});

export async function GET() {
  try {
    const user = await requireSession();
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("notification_preferences")
      .select("email_events")
      .eq("profile_id", user.authUserId)
      .maybeSingle();
    return apiOk({ emailEvents: (data?.email_events as Record<string, boolean> | null) ?? {} });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "prefs_failed", "Could not load notification preferences.");
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireSession();
    const body = bodySchema.parse(await request.json());
    const emailEvents = Object.fromEntries(
      NOTIFICATION_EVENTS.map((event) => [event, Boolean(body.emailEvents[event])]),
    );
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("notification_preferences").upsert({
      profile_id: user.authUserId,
      organization_id: user.organization.id,
      email_events: emailEvents,
      updated_at: new Date().toISOString(),
    });
    if (error) return apiError(400, "prefs_failed", "Could not save notification preferences.");
    return apiOk({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "prefs_failed", "Could not save notification preferences.");
  }
}
