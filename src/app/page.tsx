import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import { AuthError, getSessionUser, redirectForUser } from "@/lib/auth/session";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const user = await getSessionUser();
    if (user) redirect(redirectForUser(user));
  } catch (error) {
    if (error instanceof AuthError && error.code === "pending") redirect("/waiting");
    if (error instanceof AuthError && error.code === "inactive") redirect("/login?error=inactive");
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <BrandLockup />
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="text-lg text-[#5E6B75]">{brand.tagline}</p>
        <p className="max-w-xl text-[#5E6B75]">
          Drivers photograph diesel receipts. Managers see every truck&apos;s gallons, spend, and
          estimated fuel — with the original image kept for audit.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" variant="amber" className="w-full max-w-xs">
          <Link href="/signup">Create a company</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full max-w-xs">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
