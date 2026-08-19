import Link from "next/link";
import { redirect } from "next/navigation";
import { RouteMark } from "@/components/brand/route-mark";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import { rethrowIfNextRedirect } from "@/lib/auth/redirect-error";
import { AuthError, getSessionUser, redirectForUser } from "@/lib/auth/session";
import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch (error) {
    rethrowIfNextRedirect(error);
    if (error instanceof AuthError && error.code === "pending") redirect("/waiting");
    if (error instanceof AuthError && error.code === "inactive") redirect("/login?error=inactive");
  }
  if (user) redirect(redirectForUser(user));
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <main id="main" className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16">
        <BrandLockup />
        <div className="mt-10 max-w-xl space-y-5">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
            Smarter fuel decisions. <span className="text-route">Further.</span>
          </h1>
          <p className="max-w-[42ch] text-lg leading-relaxed text-muted">{brand.valueLine}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary" className="w-full sm:w-auto">
              <Link href="/signup">Create a company</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
        <dl className="mt-14 grid max-w-xl gap-6 sm:grid-cols-2">
          <div>
            <dt className="font-display text-base font-semibold text-ink">For drivers</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted">
              Photograph the diesel receipt. Confirm the numbers. Keep driving.
            </dd>
          </div>
          <div>
            <dt className="font-display text-base font-semibold text-ink">For managers</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted">
              Truck-first spend, gallons, and estimated fuel with the original image on file.
            </dd>
          </div>
        </dl>
      </main>
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <RouteMark size={72} tone="dark" />
        <div className="space-y-4">
          <p className="font-display text-3xl font-semibold tracking-tight text-balance">
            Every gallon. Every truck. One clear trail.
          </p>
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-route" />
            <span className="h-1.5 w-10 rounded-full bg-route" />
            <span className="h-1.5 w-10 rounded-full bg-route" />
            <span className="h-1.5 w-10 rounded-full bg-steel/70" />
          </div>
        </div>
        <p className="text-sm text-steel">Originals stay private. OCR is an assistant, not the record.</p>
      </aside>
    </div>
  );
}
