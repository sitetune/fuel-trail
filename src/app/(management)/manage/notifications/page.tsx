import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ManageNotificationsPage() {
  const user = await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, href, event_type, read_at, created_at")
    .eq("recipient_id", user.authUserId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Alerts</h1>
      <NotificationInbox notifications={data ?? []} />
    </div>
  );
}
