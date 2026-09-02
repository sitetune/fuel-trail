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
  returnTo?: "waiting" | "billing";
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
  const returnTo = input.returnTo ?? "billing";
  const successUrl =
    returnTo === "waiting"
      ? `${appUrl()}/waiting?session_id={CHECKOUT_SESSION_ID}`
      : `${appUrl()}/manage/billing?billing=ok&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = returnTo === "waiting" ? `${appUrl()}/waiting` : `${appUrl()}/manage/billing`;
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId || undefined,
    customer_email: input.customerId ? undefined : input.email,
    line_items: [{ price, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
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
    // Test accounts enable Managed Payments by default; that requires a product
    // tax_code. FuelTrail is the merchant of record for these subscriptions.
    managed_payments: { enabled: false },
  } as Stripe.Checkout.SessionCreateParams);
}

export async function changeSubscriptionPlan(input: {
  subscriptionId: string;
  organizationId: string;
  planId: PlanId;
  interval: BillingInterval;
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
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error("This subscription has no price to change.");
  }
  return stripe.subscriptions.update(input.subscriptionId, {
    items: [{ id: itemId, price }],
    proration_behavior: "create_prorations",
    metadata: {
      organization_id: input.organizationId,
      plan_id: input.planId,
      billing_interval: input.interval,
    },
  });
}
