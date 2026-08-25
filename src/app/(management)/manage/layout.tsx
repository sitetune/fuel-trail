import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OfflineBadge } from "@/components/offline-badge";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ManageSidebar } from "@/components/shell/manage-sidebar";
import { AuthError, requireManagement } from "@/lib/auth/session";
import { isPlatformAdminEmail } from "@/lib/orgs/status";
import { notifyAgingReceipts } from "@/lib/notifications";

const links = [
  { href: "/manage", label: "Dashboard" },
  { href: "/manage/receipts", label: "Receipts" },
  { href: "/manage/trucks", label: "Trucks" },
  { href: "/manage/reports", label: "Reports" },
  { href: "/manage/savings", label: "Savings" },
  { href: "/manage/import", label: "Import" },
  { href: "/manage/setup", label: "Setup" },
  { href: "/manage/routes", label: "Fuel stops" },
  { href: "/manage/users", label: "Users" },
  { href: "/manage/notifications", label: "Alerts" },
  { href: "/manage/settings", label: "Settings" },
];

export const dynamic = "force-dynamic";

export default async function ManageLayout({ children }: { children: ReactNode }) {
  let user;
  try {
    user = await requireManagement();
  } catch (error) {
    if (error instanceof AuthError && error.code === "pending") redirect("/waiting");
    redirect("/login");
  }
  if (!user) redirect("/login");
  void notifyAgingReceipts(user.organization.id);
  const nav = isPlatformAdminEmail(user.profile.email)
    ? [...links, { href: "/internal", label: "Admin" }]
    : links;
  return (
    <div className="min-h-[100dvh] bg-warm lg:flex">
      <ServiceWorkerRegister />
      <OfflineBadge />
      <ManageSidebar
        links={nav}
        logoUrl={user.organization.logo_path ? "/api/org/logo" : null}
        auditor={user.profile.role === "auditor"}
        userLabel={user.profile.full_name ?? user.profile.email}
      />
      <div className="min-w-0 flex-1">
        <div className="hidden h-14 items-center justify-end border-b border-steel/25 bg-white px-6 lg:flex">
          <NotificationBell user={user} href="/manage/notifications" />
        </div>
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
