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
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <BrandLockup href="/internal" />
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link href="/internal">Organizations</Link>
            <Link href="/manage">Manage</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
