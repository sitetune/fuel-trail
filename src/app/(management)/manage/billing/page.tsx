import { Badge, Card } from "@/components/ui/card";
import { ResumeCheckoutButton } from "@/components/billing/resume-checkout-button";
import { canManageOrgSettings } from "@/lib/auth/roles";
import { requireManagement } from "@/lib/auth/session";
import { orgPlanId } from "@/lib/billing/assert";
import { PLAN_LIST, PLANS, parseBillingInterval } from "@/lib/billing/plans";
import { completePaidCheckout } from "@/lib/billing/webhook";
import { redirect } from "next/navigation";

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

const STATUS_LABEL: Record<string, string> = {
  none: "No subscription",
  pending: "Waiting for payment",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string; session_id?: string }>;
}) {
  const user = await requireManagement();
  if (!canManageOrgSettings(user.profile.role)) redirect("/manage/settings");
  const params = await searchParams;
  if (params.session_id) {
    try {
      await completePaidCheckout(params.session_id, user.organization.id);
    } catch {
      // Webhook may already have applied the session.
    }
  }
  const planId = orgPlanId(user.organization);
  const plan = planId ? PLANS[planId] : null;
  const interval = parseBillingInterval(user.organization.billing_interval);
  const status = user.organization.billing_status ?? "none";
  const price = plan ? (interval === "year" ? plan.annual : plan.monthly) : null;
  const needsPayment = status === "pending" || status === "past_due" || status === "unpaid";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted">Plan, payment status, and upgrades for this company.</p>
      </div>
      {params.billing === "ok" ? (
        <p className="text-sm text-success">Payment received. Your plan is active.</p>
      ) : null}
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{plan?.name ?? "No plan"}</h2>
            <p className="text-sm text-muted">{plan?.fleet ?? "Choose a plan to unlock the workspace."}</p>
          </div>
          <Badge tone={status === "active" ? "success" : status === "pending" ? "route" : "neutral"}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </div>
        <p className="font-display text-2xl font-semibold tabular-nums tracking-tight">
          {price == null ? "Custom" : formatUsd(price)}
          {price != null ? (
            <span className="ml-1 text-sm font-medium text-muted">{interval === "year" ? "/year" : "/month"}</span>
          ) : null}
        </p>
        {plan ? (
          <ul className="space-y-1 text-sm text-muted">
            {plan.featureLabels.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        ) : null}
        {needsPayment && plan?.selfServe ? (
          <ResumeCheckoutButton
            plan={plan.id}
            period={interval === "year" ? "annual" : "month"}
            label="Complete payment"
          />
        ) : null}
        {plan && !plan.selfServe ? (
          <p className="text-sm text-muted">Enterprise is activated by FuelTrail. Email hello@fueltrail.app to change this plan.</p>
        ) : null}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Change plan</h2>
        <p className="text-sm text-muted">Annual is 12 months for the price of 10. Checkout uses the same Stripe test or live catalog as this environment.</p>
        <div className="space-y-3">
          {PLAN_LIST.filter((item) => item.selfServe).map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-steel/25 px-3 py-3">
              <div>
                <p className="font-medium">
                  {item.name}
                  {item.id === plan?.id ? " · current" : ""}
                </p>
                <p className="text-sm text-muted">
                  {formatUsd(item.monthly ?? 0)}/mo or {formatUsd(item.annual ?? 0)}/yr · {item.fleet}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ResumeCheckoutButton plan={item.id} period="month" label="Monthly" variant="outline" />
                <ResumeCheckoutButton plan={item.id} period="annual" label="Annual" variant="outline" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
