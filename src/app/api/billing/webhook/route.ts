import { apiError, apiOk } from "@/lib/api/http";
import { applyCheckoutCompleted, applySubscriptionChange } from "@/lib/billing/webhook";
import { getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return apiError(400, "stripe_missing", "STRIPE_WEBHOOK_SECRET is not set.");
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return apiError(400, "stripe_signature", "Missing Stripe signature.");
  }
  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
    if (event.type === "checkout.session.completed") {
      await applyCheckoutCompleted(event.data.object);
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await applySubscriptionChange(event.data.object);
    }
    return apiOk({ received: true });
  } catch (error) {
    return apiError(400, "webhook_failed", error instanceof Error ? error.message : "Webhook failed.");
  }
}
