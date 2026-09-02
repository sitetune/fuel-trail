import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartLineUp, FileText, PlayCircle, Truck } from "@phosphor-icons/react/ssr";
import { HomeHeader } from "@/components/marketing/home-header";
import { HeroScene } from "@/components/marketing/hero-scene";
import { DriverScreens } from "@/components/marketing/driver-screens";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Button } from "@/components/ui/button";
import { rethrowIfNextRedirect } from "@/lib/auth/redirect-error";
import { AuthError, getSessionUser, redirectForUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const proofs = [
  {
    title: "Receipt capture",
    body: "Digitize and verify fuel receipts in seconds.",
    icon: FileText,
  },
  {
    title: "Truck-level reports",
    body: "See exactly what each truck spends, every day.",
    icon: Truck,
  },
  {
    title: "Fuel savings insights",
    body: "Spot trends, reduce waste, and keep more in your pocket.",
    icon: ChartLineUp,
  },
];

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
    <div className="min-h-[100dvh] overflow-x-hidden bg-ink text-warm">
      <HomeHeader />
      <main id="main">
        <section className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col">
          <HeroScene />
          <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
            <div className="max-w-xl lg:max-w-[34rem]">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-route uppercase">
                Fuel receipts. Fleet intelligence.
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-[4.35rem]">
                Every gallon. Every truck. <span className="text-sky">Under control.</span>
              </h1>
              <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-steel sm:text-lg">
                Capture fuel receipts, track spending by truck, and find savings without chasing paperwork.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" variant="primary" className="w-full sm:w-auto">
                  <Link href="/signup">Get started</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-white/25 bg-transparent text-warm hover:bg-white/10 sm:w-auto"
                >
                  <Link href="#how-it-works">
                    <PlayCircle size={22} weight="regular" />
                    See how it works
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <section id="product" className="relative z-10 mx-auto w-full max-w-6xl shrink-0 px-4 pb-5 sm:px-6 lg:px-8 lg:pb-7">
            <div className="grid gap-4 rounded-xl border border-white/10 bg-ink/90 px-4 py-4 shadow-[0_16px_40px_rgba(11,23,40,0.35)] backdrop-blur-md sm:grid-cols-3 sm:gap-0 sm:px-2 sm:py-5">
              {proofs.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={
                      index === 0
                        ? "flex gap-3 px-3 sm:border-r sm:border-white/10"
                        : index === 1
                          ? "flex gap-3 px-3 sm:border-r sm:border-white/10"
                          : "flex gap-3 px-3"
                    }
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-route/20 text-sky">
                      <Icon size={20} weight="regular" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold text-warm">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-steel">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        <DriverScreens />

        <section id="pricing" className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <PricingTable />
          </div>
        </section>
      </main>

      <footer id="resources" className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-route uppercase">Resources</p>
            <p className="mt-3 text-sm leading-relaxed text-steel">
              Originals stay private. OCR is an assistant, not the record.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-warm">Support</p>
            <a className="block text-steel hover:text-white" href="mailto:hello@fueltrail.app">
              hello@fueltrail.app
            </a>
            <Link className="block text-steel hover:text-white" href="/login">
              Sign in
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-warm">Legal</p>
            <p className="text-steel">Receipt images stay in your company workspace.</p>
            <Link className="block font-medium text-route hover:text-sky" href="/signup">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
