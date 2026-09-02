"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { PLAN_LIST, type BillingInterval, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function PlanPicker({
  defaultPlan,
  defaultInterval = "month",
  name = "plan",
  onChange,
}: {
  defaultPlan?: PlanId | null;
  defaultInterval?: BillingInterval;
  name?: string;
  onChange?: (plan: PlanId | "", interval: BillingInterval) => void;
}) {
  const [annual, setAnnual] = useState(defaultInterval === "year");
  const [selected, setSelected] = useState<PlanId | "">(defaultPlan ?? "");
  function setPlan(next: PlanId | "") {
    setSelected(next);
    onChange?.(next, annual ? "year" : "month");
  }
  function setPeriod(nextAnnual: boolean) {
    setAnnual(nextAnnual);
    onChange?.(selected, nextAnnual ? "year" : "month");
  }
  return (
    <fieldset className="space-y-3">
      <legend className="font-display text-lg font-semibold tracking-tight text-ink">Choose a plan</legend>
      <input type="hidden" name="period" value={annual ? "annual" : "month"} />
      <div className="space-y-3">
        <p className="text-sm text-muted">Same packages as the homepage. Annual is 12 months for the price of 10.</p>
        <div
          className="grid w-full grid-cols-2 rounded-full border border-steel/40 bg-warm p-1"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            className={cn(
              "min-h-10 rounded-full px-4 text-sm font-semibold",
              !annual ? "bg-route text-white" : "text-muted hover:text-ink",
            )}
            aria-pressed={!annual}
            onClick={() => setPeriod(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cn(
              "min-h-10 rounded-full px-4 text-sm font-semibold",
              annual ? "bg-route text-white" : "text-muted hover:text-ink",
            )}
            aria-pressed={annual}
            onClick={() => setPeriod(true)}
          >
            Annually
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {PLAN_LIST.map((plan) => {
          const price = annual ? plan.annual : plan.monthly;
          const saved = plan.monthly != null && plan.annual != null ? plan.monthly * 12 - plan.annual : null;
          const active = selected === plan.id;
          return (
            <label
              key={plan.id}
              className={cn(
                "block cursor-pointer rounded-xl border p-4 transition-colors",
                active
                  ? "border-route bg-route/5 shadow-[0_8px_20px_rgba(23,107,255,0.12)]"
                  : "border-steel/30 hover:border-route/50",
              )}
            >
              <input
                type="radio"
                name={name}
                value={plan.id}
                checked={active}
                required
                className="sr-only"
                onChange={() => setPlan(plan.id)}
              />
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {plan.name}
                    {plan.featured ? (
                      <span className="rounded-full bg-route px-2 py-0.5 text-[11px] font-semibold text-white">
                        Most fleets
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">{plan.fleet}</p>
                </div>
                <p className="font-display text-xl font-semibold tabular-nums tracking-tight">
                  {price == null ? "Custom" : formatUsd(price)}
                  {price != null ? (
                    <span className="ml-1 text-xs font-medium text-muted">{annual ? "/yr" : "/mo"}</span>
                  ) : null}
                </p>
              </div>
              {annual && saved != null && saved > 0 ? (
                <p className="mt-1 text-xs font-semibold text-route">Save {formatUsd(saved)}</p>
              ) : null}
              <ul className="mt-3 space-y-1.5">
                {plan.featureLabels.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-relaxed text-muted">
                    <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-route" />
                    {feature}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
