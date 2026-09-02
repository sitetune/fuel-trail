"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlanPicker } from "@/components/billing/plan-picker";
import { PLANS, type BillingInterval, type PlanId } from "@/lib/billing/plans";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function WaitingPlanCheckout({
  defaultPlan,
  defaultInterval,
}: {
  defaultPlan?: PlanId | null;
  defaultInterval?: BillingInterval;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<{ plan: PlanId | ""; interval: BillingInterval }>({
    plan: defaultPlan ?? "",
    interval: defaultInterval ?? "month",
  });
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const planId = String(form.get("plan") || "") as PlanId;
        const period = String(form.get("period") || "month");
        const plan = PLANS[planId];
        if (!plan) {
          setMessage("Choose a plan to continue.");
          return;
        }
        if (!plan.selfServe) {
          window.location.assign("mailto:hello@fueltrail.app?subject=FuelTrail%20Enterprise");
          return;
        }
        setBusy(true);
        setMessage("");
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId, period }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { data?: { url?: string; updated?: boolean }; error?: { message?: string } }
          | null;
        if (payload?.data?.updated) {
          router.push("/manage/billing?billing=ok");
          return;
        }
        if (payload?.data?.url) {
          window.location.assign(payload.data.url);
          return;
        }
        setBusy(false);
        setMessage(payload?.error?.message ?? "Could not start checkout. Try again.");
      }}
    >
      <PlanPicker
        defaultPlan={defaultPlan}
        defaultInterval={defaultInterval}
        onChange={(plan, interval) => setChoice({ plan, interval })}
      />
      <Button type="submit" variant="primary" className="w-full" size="lg" disabled={busy}>
        {busy ? "Opening checkout…" : checkoutLabel(choice.plan || null, choice.interval)}
      </Button>
      {message ? <p className="text-sm text-alert">{message}</p> : null}
    </form>
  );
}

function checkoutLabel(planId?: PlanId | null, interval?: BillingInterval) {
  const plan = planId ? PLANS[planId] : null;
  if (!plan) return "Continue to payment";
  if (!plan.selfServe) return "Talk to us";
  const price = interval === "year" ? plan.annual : plan.monthly;
  if (price == null) return `Activate ${plan.name}`;
  return `Activate ${plan.name} · ${formatUsd(price)}${interval === "year" ? "/yr" : "/mo"}`;
}
