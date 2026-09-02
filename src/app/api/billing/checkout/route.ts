import { AuthError, getSessionUser } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { parseBillingInterval, parsePlanId, PLANS } from "@/lib/billing/plans";
import { changeSubscriptionPlan, createCheckoutSession } from "@/lib/billing/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser({ allowPending: true });
    if (!user) {
      throw new AuthError("Sign in required.", "unauthenticated");
    }
    if (user.profile.role !== "owner_admin") {
      throw new AuthError("Owner access required.", "forbidden");
    }
    const body = (await request.json().catch(() => ({}))) as { plan?: string; period?: string };
    const planId = parsePlanId(body.plan) ?? parsePlanId(user.organization.plan_id);
    const interval = parseBillingInterval(body.period ?? user.organization.billing_interval);
    if (!planId || !PLANS[planId].selfServe) {
      return apiError(400, "plan_required", "Choose Starter, Growth, or Fleet to check out.");
    }
    const subscriptionId = user.organization.stripe_subscription_id;
    if (subscriptionId && user.organization.billing_status === "active") {
      await changeSubscriptionPlan({
        subscriptionId,
        organizationId: user.organization.id,
        planId,
        interval,
      });
      const admin = createServiceRoleClient();
      await admin
        .from("organizations")
        .update({
          plan_id: planId,
          billing_interval: interval,
          billing_status: "active",
        })
        .eq("id", user.organization.id);
      return apiOk({ updated: true });
    }
    const session = await createCheckoutSession({
      organizationId: user.organization.id,
      email: user.profile.email,
      planId,
      interval,
      customerId: user.organization.stripe_customer_id,
    });
    if (!session.url) {
      return apiError(400, "checkout_failed", "Stripe did not return a checkout URL.");
    }
    return apiOk({ url: session.url });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(
      400,
      "checkout_failed",
      error instanceof Error ? error.message : "Could not start Stripe Checkout.",
    );
  }
}
