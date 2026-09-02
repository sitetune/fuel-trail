import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResumeCheckoutButton } from "@/components/billing/resume-checkout-button";
import { SignOutButton } from "@/components/sign-out-button";
import { PLANS, parsePlanId } from "@/lib/billing/plans";
import { getSessionUser } from "@/lib/auth/session";

export default async function WaitingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  let user = null;
  try {
    user = await getSessionUser({ allowPending: true });
  } catch {
    user = null;
  }
  const plan = parsePlanId(user?.organization.plan_id);
  const selfServe = plan ? PLANS[plan].selfServe : false;
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {selfServe ? "Finish payment to activate" : "Waiting for activation"}
      </h1>
      <p className="text-sm leading-relaxed text-muted">
        {selfServe
          ? "Your company is saved. Complete Stripe Checkout to turn on the workspace."
          : "Your company account was created. A FuelTrail administrator still needs to activate it for this pilot."}
      </p>
      {params.error === "billing" ? (
        <p className="text-sm text-alert">
          Stripe Checkout is not configured in this environment. Set the Stripe keys and price IDs, then try payment
          again. The company stays pending until payment succeeds.
        </p>
      ) : null}
      {selfServe ? <ResumeCheckoutButton /> : null}
      <SignOutButton />
      <Button asChild variant="outline" className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </Card>
  );
}
