"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PLAN_LIST, signupHref, type BillingInterval } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function PricingTable() {
  const [annual, setAnnual] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const interval: BillingInterval = annual ? "year" : "month";
  return (
    <div>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-route uppercase">Pricing</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-balance">
            Plans that scale with the fleet
          </h2>
          <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-steel">
            Pick a workspace by truck count. Annual billing covers 12 months for the price of 10.
          </p>
        </div>
        <div
          className="relative inline-grid grid-cols-2 rounded-full border border-white/15 bg-white/5 p-1"
          role="group"
          aria-label="Billing period"
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-route shadow-[0_8px_20px_rgba(23,107,255,0.28)] transition-transform duration-200 motion-reduce:transition-none",
              annual && "translate-x-[calc(100%+4px)]",
            )}
          />
          <button
            type="button"
            className={cn(
              "relative z-10 min-h-11 rounded-full px-5 text-sm font-semibold transition-colors",
              !annual ? "text-white" : "text-warm/70 hover:text-white",
            )}
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cn(
              "relative z-10 min-h-11 rounded-full px-5 text-sm font-semibold transition-colors",
              annual ? "text-white" : "text-warm/70 hover:text-white",
            )}
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
          >
            Annually
          </button>
        </div>
      </div>

      <div className="mt-10 grid items-stretch gap-5 overflow-visible py-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_LIST.map((plan) => {
          const price = annual ? plan.annual : plan.monthly;
          const saved = plan.monthly != null && plan.annual != null ? plan.monthly * 12 - plan.annual : null;
          const active = hovered ? hovered === plan.id : plan.featured;
          return (
            <article
              key={plan.id}
              onMouseEnter={() => setHovered(plan.id)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "flex flex-col rounded-xl border p-5 origin-center transition-[transform,box-shadow,background-color,border-color] duration-200",
                active
                  ? "z-10 border-route bg-route/15 shadow-[0_16px_40px_rgba(23,107,255,0.28)] md:scale-[1.06]"
                  : "z-0 border-white/10 bg-white/5 md:scale-100",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold text-warm">{plan.name}</h3>
                {plan.featured ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      active ? "bg-route text-white" : "bg-white/10 text-steel",
                    )}
                  >
                    Most fleets
                  </span>
                ) : null}
              </div>
              <p className="mt-4 font-display text-3xl font-semibold tabular-nums tracking-tight text-warm">
                {price == null ? "Custom" : formatUsd(price)}
                {price != null ? (
                  <span className="ml-1 text-sm font-medium text-steel">{annual ? "/year" : "/month"}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-sky">{plan.fleet}</p>
              {annual && saved != null && saved > 0 ? (
                <p className="mt-2 text-xs font-semibold text-sky">Save {formatUsd(saved)}</p>
              ) : null}
              <ul className="mt-5 flex-1 space-y-2">
                {plan.featureLabels.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-relaxed text-steel">
                    <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-sky" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={active ? "primary" : "outline"}
                className={
                  active
                    ? "mt-6 w-full"
                    : "mt-6 w-full border-white/25 bg-transparent text-warm hover:bg-white/10"
                }
              >
                <Link href={signupHref(plan, interval)}>{plan.cta}</Link>
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
