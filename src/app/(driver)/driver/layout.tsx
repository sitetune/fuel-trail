import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OfflineBadge } from "@/components/offline-badge";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { DriverHeader } from "@/components/shell/driver-header";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  let user;
  try {
    user = await requireSession();
  } catch {
    redirect("/login");
  }
  if (user.profile.role !== "driver") {
    redirect("/manage");
  }
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.authUserId)
    .is("read_at", null);
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-warm">
      <ServiceWorkerRegister />
      <OfflineBadge />
      <DriverHeader
        logoUrl={user.organization.logo_path ? "/api/org/logo" : null}
        unread={count ?? 0}
      />
      <main id="main" className="flex-1 px-4 py-5">
        {children}
      </main>
    </div>
  );
}
