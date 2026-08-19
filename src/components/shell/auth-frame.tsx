import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { brand } from "@/config/brand";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandLockup href="/" tone="dark" />
        <div className="max-w-md space-y-5">
          <p className="font-display text-4xl font-semibold tracking-tight text-balance">
            Smarter fuel decisions.{" "}
            <span className="text-route">Further.</span>
          </p>
          <p className="max-w-[42ch] text-base leading-relaxed text-steel">{brand.valueLine}</p>
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-route" />
            <span className="h-1.5 w-10 rounded-full bg-route" />
            <span className="h-1.5 w-10 rounded-full bg-route" />
            <span className="h-1.5 w-10 rounded-full bg-steel/70" />
          </div>
        </div>
        <p className="text-sm text-steel/80">{brand.name} keeps the original receipt for audit.</p>
        <div
          className="pointer-events-none absolute -right-16 -bottom-20 h-72 w-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
      </aside>
      <div className="flex flex-col justify-center bg-warm px-4 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLockup href="/" showTagline />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
