import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { parseBillingInterval, parsePlanId } from "./plans";
import { planFromStripePriceId } from "./stripe";

function billingStatusFromStripe(status: string | null | undefined) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past_due";
  if (status === "unpaid") return "unpaid";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "pending";
}

export async function applyCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organization_id;
  if (!organizationId) return;
  const planId = parsePlanId(session.metadata?.plan_id);
  const interval = parseBillingInterval(session.metadata?.billing_interval);
  const admin = createServiceRoleClient();
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
  await admin
    .from("organizations")
    .update({
      status: "active",
      plan_id: planId,
      billing_interval: interval,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      billing_status: "active",
    })
    .eq("id", organizationId);
}

export async function applySubscriptionChange(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organization_id;
  const admin = createServiceRoleClient();
  const priceId = subscription.items.data[0]?.price?.id;
  const fromPrice = planFromStripePriceId(priceId);
  const planId = parsePlanId(subscription.metadata?.plan_id) ?? fromPrice?.planId ?? null;
  const interval = subscription.metadata?.billing_interval
    ? parseBillingInterval(subscription.metadata.billing_interval)
    : (fromPrice?.interval ?? "month");
  const billingStatus = billingStatusFromStripe(subscription.status);
  const payload: Record<string, unknown> = {
    plan_id: planId,
    billing_interval: interval,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id,
    billing_status: billingStatus,
  };
  if (billingStatus === "canceled" || billingStatus === "unpaid") payload.status = "deactivated";
  if (billingStatus === "active") payload.status = "active";
  if (organizationId) {
    await admin.from("organizations").update(payload).eq("id", organizationId);
    return;
  }
  await admin.from("organizations").update(payload).eq("stripe_subscription_id", subscription.id);
}
