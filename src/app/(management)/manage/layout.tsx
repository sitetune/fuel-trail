import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand-lockup";
import { OfflineBadge } from "@/components/offline-badge";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { requireManagement } from "@/lib/auth/session";

const links = [
  { href: "/manage", label: "Fleet" },
  { href: "/manage/trucks", label: "Trucks" },
  { href: "/manage/receipts", label: "Receipts" },
  { href: "/manage/reports", label: "Reports" },
  { href: "/manage/savings", label: "Savings" },
  { href: "/manage/import", label: "Import" },
  { href: "/manage/routes", label: "Fuel stops" },
  { href: "/manage/stations", label: "Stations" },
  { href: "/manage/users", label: "Users" },
  { href: "/manage/audit", label: "Audit" },
  { href: "/manage/settings", label: "Settings" },
];

export const dynamic = "force-dynamic";

export default async function ManageLayout({ children }: { children: ReactNode }) {
  let user;
  try {
    user = await requireManagement();
  } catch {
    redirect("/login");
  }
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <ServiceWorkerRegister />
      <OfflineBadge />
      <header className="border-b border-[#5E6B75]/20 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <BrandLockup href="/manage" />
          <div className="flex items-center gap-2">
            <NotificationBell user={user} href="/manage/notifications" />
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 text-sm font-medium text-[#0B1F33] hover:bg-[#F7F8FA]"
          >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
