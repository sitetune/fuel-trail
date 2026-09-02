import Stripe from "stripe";
import { PLANS, type BillingInterval, type PlanId } from "./plans";

const PRICE_ENV: Record<Exclude<PlanId, "enterprise">, Record<BillingInterval, string>> = {
  starter: { month: "STRIPE_PRICE_STARTER_MONTHLY", year: "STRIPE_PRICE_STARTER_ANNUAL" },
  growth: { month: "STRIPE_PRICE_GROWTH_MONTHLY", year: "STRIPE_PRICE_GROWTH_ANNUAL" },
  fleet: { month: "STRIPE_PRICE_FLEET_MONTHLY", year: "STRIPE_PRICE_FLEET_ANNUAL" },
};

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function getStripe() {
  const key = stripeSecretKey();
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and the plan price IDs.");
  }
  return new Stripe(key);
}

export function stripePriceId(planId: PlanId, interval: BillingInterval) {
  if (planId === "enterprise") return null;
  const envName = PRICE_ENV[planId][interval];
  return process.env[envName]?.trim() || null;
}

export function planFromStripePriceId(priceId: string | null | undefined): {
  planId: PlanId;
  interval: BillingInterval;
} | null {
  if (!priceId) return null;
  for (const planId of ["starter", "growth", "fleet"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (stripePriceId(planId, interval) === priceId) {
        return { planId, interval };
      }
    }
  }
  return null;
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3021";
}

export async function createCheckoutSession(input: {
  organizationId: string;
  email: string;
  planId: PlanId;
  interval: BillingInterval;
  customerId?: string | null;
}) {
  const plan = PLANS[input.planId];
  if (!plan.selfServe) {
    throw new Error("Enterprise is not available for self-serve checkout.");
  }
  const price = stripePriceId(input.planId, input.interval);
  if (!price) {
    throw new Error(`Missing Stripe price ID for ${plan.name} ${input.interval === "year" ? "annual" : "monthly"}.`);
  }
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId || undefined,
    customer_email: input.customerId ? undefined : input.email,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/manage/setup?billing=ok`,
    cancel_url: `${appUrl()}/waiting`,
    metadata: {
      organization_id: input.organizationId,
      plan_id: input.planId,
      billing_interval: input.interval,
    },
    subscription_data: {
      metadata: {
        organization_id: input.organizationId,
        plan_id: input.planId,
        billing_interval: input.interval,
      },
    },
  });
}
