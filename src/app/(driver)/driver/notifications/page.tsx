import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { NotificationEvent } from "@/lib/notifications";
import { redirect } from "next/navigation";

export default async function DriverNotificationsPage() {
  const user = await requireSession();
  if (user.profile.role !== "driver") redirect("/manage/notifications");
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
      <h1 className="text-2xl font-semibold">Alerts</h1>
      <NotificationInbox notifications={data ?? []} />
      <NotificationPreferences emailEvents={(prefs?.email_events as Partial<Record<NotificationEvent, boolean>> | null) ?? {}} />
    </div>
  );
}
