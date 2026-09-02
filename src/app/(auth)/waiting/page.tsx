import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { WaitingPlanCheckout } from "@/components/billing/waiting-plan-checkout";
import { SignOutButton } from "@/components/sign-out-button";
import { parseBillingInterval, parsePlanId, PLANS } from "@/lib/billing/plans";
import { completePaidCheckout } from "@/lib/billing/webhook";
import { getSessionUser } from "@/lib/auth/session";

export default async function WaitingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  let user = null;
  try {
    user = await getSessionUser({ allowPending: true });
  } catch {
    user = null;
  }
  if (!user) redirect("/login");
  if (params.session_id) {
    let activated = false;
    try {
      await completePaidCheckout(params.session_id, user.organization.id);
      activated = true;
    } catch {
      activated = false;
    }
    if (activated) redirect("/manage/setup");
  }
  const plan = parsePlanId(user.organization.plan_id);
  const interval = parseBillingInterval(user.organization.billing_interval);
  const selfServe = plan ? PLANS[plan].selfServe : true;
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {selfServe || !plan ? "Choose a plan to activate" : "Waiting for activation"}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {selfServe || !plan
            ? "Your company is saved. Pick Starter, Growth, or Fleet, then finish Stripe Checkout to turn the workspace on."
            : "Your company account was created. A FuelTrail administrator still needs to activate Enterprise."}
        </p>
      </div>
      {params.error === "billing" ? (
        <p className="text-sm text-alert">Checkout could not start. Choose a plan and try again.</p>
      ) : null}
      {selfServe || !plan ? (
        <WaitingPlanCheckout defaultPlan={plan} defaultInterval={interval} />
      ) : (
        <p className="text-sm text-muted">Email hello@fueltrail.app and we’ll turn this workspace on.</p>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-steel/25 pt-3">
        <SignOutButton />
        <Link className="text-sm font-medium text-route" href="/login">
          Back to sign in
        </Link>
      </div>
    </Card>
  );
}
