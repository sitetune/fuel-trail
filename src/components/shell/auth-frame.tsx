import type { ReactNode } from "react";
import { Check, Receipt } from "@phosphor-icons/react/ssr";
import { BrandLockup } from "@/components/brand-lockup";
import { brand } from "@/config/brand";

const bars = [
  { day: "M", height: 14 },
  { day: "T", height: 22 },
  { day: "W", height: 18 },
  { day: "T", height: 28 },
  { day: "F", height: 36 },
  { day: "S", height: 16 },
  { day: "S", height: 12 },
];

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-truck.webp"
          alt=""
          width={3434}
          height={1832}
          className="absolute inset-0 h-full w-full object-cover object-[72%_40%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink from-[12%] via-ink/70 to-ink/35" aria-hidden="true" />
        <div className="relative z-10 flex h-full flex-col justify-between px-10 py-12">
          <BrandLockup href="/" tone="dark" />
          <div className="max-w-md space-y-5">
            <p className="font-display text-4xl font-semibold tracking-tight text-balance">
              Smarter fuel decisions. <span className="text-route">Further.</span>
            </p>
            <p className="max-w-[42ch] text-base leading-relaxed text-steel">{brand.valueLine}</p>
            <article className="w-52 rounded-xl border border-sky/35 bg-ink/75 p-3.5 shadow-[0_12px_32px_rgba(11,23,40,0.35)] backdrop-blur-md">
              <div className="flex items-start gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-route/20 text-sky">
                  <Receipt size={18} weight="regular" />
                </span>
                <div>
                  <p className="text-[11px] font-medium text-warm/80">Receipt captured</p>
                  <p className="font-display text-xl font-semibold tabular-nums tracking-tight text-warm">$523.67</p>
                </div>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-route px-2 py-0.5 text-[11px] font-medium text-white">
                <Check size={12} weight="bold" />
                Verified
              </span>
            </article>
            <article className="w-56 rounded-xl border border-sky/30 bg-ink/78 p-3.5 shadow-[0_12px_32px_rgba(11,23,40,0.35)] backdrop-blur-md">
              <p className="text-[11px] font-medium text-warm/75">Truck 24 · This week</p>
              <p className="font-display text-xl font-semibold tabular-nums tracking-tight text-warm">$1,423.18</p>
              <div className="mt-3 flex h-14 items-end gap-1.5">
                {bars.map((bar, index) => (
                  <div key={`${bar.day}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span className="w-full rounded-[3px] bg-sky" style={{ height: bar.height }} />
                    <span className="text-[9px] leading-none text-steel">{bar.day}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
          <p className="text-sm text-steel/80">{brand.name} keeps the original receipt for audit.</p>
        </div>
      </aside>
      <div className="flex flex-col justify-center bg-warm px-4 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <BrandLockup href="/" showTagline />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
