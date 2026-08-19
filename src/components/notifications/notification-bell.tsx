import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/card";
import type { SessionUser } from "@/types/domain";

export async function NotificationBell({ user, href }: { user: SessionUser; href: string }) {
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.authUserId)
    .is("read_at", null);
  const unread = count ?? 0;
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#0B1F33] hover:bg-[#F7F8FA]"
    >
      Alerts
      {unread > 0 ? <Badge tone="alert">{unread > 99 ? "99+" : unread}</Badge> : null}
    </Link>
  );
}
