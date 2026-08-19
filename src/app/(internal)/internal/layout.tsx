import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand-lockup";
import { SignOutButton } from "@/components/sign-out-button";
import { AuthError, requirePlatformAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function InternalLayout({ children }: { children: ReactNode }) {
  try {
    await requirePlatformAdmin();
  } catch (error) {
    if (error instanceof AuthError && error.code === "unauthenticated") redirect("/login");
    redirect("/manage");
  }
  return (
    <div className="min-h-[100dvh] bg-warm">
      <header className="border-b border-white/10 bg-ink">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
          <BrandLockup href="/internal" tone="dark" />
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/internal" className="rounded-lg px-3 py-2 text-white hover:bg-white/10">
              Organizations
            </Link>
            <Link href="/manage" className="rounded-lg px-3 py-2 text-steel hover:bg-white/10 hover:text-white">
              Manage
            </Link>
            <SignOutButton className="text-white hover:bg-white/10 hover:text-white" />
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1400px] px-4 py-6">
        {children}
      </main>
    </div>
  );
}
