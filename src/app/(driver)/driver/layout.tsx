import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand-lockup";
import { OfflineBadge } from "@/components/offline-badge";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import { requireSession } from "@/lib/auth/session";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";

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
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <ServiceWorkerRegister />
      <OfflineBadge />
      <header className="flex items-center justify-between gap-3 border-b border-[#5E6B75]/20 bg-white px-4 py-3">
        <BrandLockup href="/driver" />
        <nav className="flex min-h-11 items-center gap-3 overflow-x-auto text-sm font-medium">
          <Link href="/driver" className="shrink-0">
            Home
          </Link>
          <Link href="/driver/receipts" className="shrink-0">
            Receipts
          </Link>
          <Link href="/driver/queue" className="shrink-0">
            Queue
          </Link>
          <NotificationBell user={user} href="/driver/notifications" />
        </nav>
        <SignOutButton />
      </header>
      <div className="flex-1 px-4 py-4">{children}</div>
      <form action={signOutAction} className="hidden">
        <Button type="submit">Sign out</Button>
      </form>
      <p className="sr-only">
        <Link href="/manage">Management</Link>
      </p>
    </div>
  );
}
