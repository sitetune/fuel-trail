import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { NotificationEvent } from "@/lib/notifications";

export default async function ManageNotificationsPage() {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const [{ data }, { data: prefs }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, body, href, event_type, read_at, created_at")
      .eq("recipient_id", user.authUserId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("notification_preferences").select("email_events").eq("profile_id", user.authUserId).maybeSingle(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Alerts</h1>
      <NotificationInbox notifications={data ?? []} />
      <NotificationPreferences
        emailEvents={(prefs?.email_events as Partial<Record<NotificationEvent, boolean>> | null) ?? {}}
      />
    </div>
  );
}
