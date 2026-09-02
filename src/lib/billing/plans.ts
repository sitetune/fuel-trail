export const PLAN_IDS = ["starter", "growth", "fleet", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type BillingInterval = "month" | "year";
export type PlanFeature =
  | "receipts"
  | "driver_app"
  | "reports"
  | "savings"
  | "fuel_stops"
  | "audit_exports"
  | "auditors"
  | "review_rules";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  monthly: number | null;
  annual: number | null;
  maxTrucks: number | null;
  fleet: string;
  features: PlanFeature[];
  featureLabels: string[];
  cta: string;
  selfServe: boolean;
  featured: boolean;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    monthly: 39,
    annual: 390,
    maxTrucks: 5,
    fleet: "Up to 5 trucks",
    features: ["receipts", "driver_app"],
    featureLabels: ["Receipt capture in the cab", "Original images on file", "Driver app"],
    cta: "Get started",
    selfServe: true,
    featured: false,
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthly: 99,
    annual: 990,
    maxTrucks: 25,
    fleet: "Up to 25 trucks",
    features: ["receipts", "driver_app", "reports", "savings"],
    featureLabels: ["Everything in Starter", "Truck-level spend reports", "Fuel savings insights"],
    cta: "Get started",
    selfServe: true,
    featured: true,
  },
  fleet: {
    id: "fleet",
    name: "Fleet",
    monthly: 229,
    annual: 2290,
    maxTrucks: 75,
    fleet: "Up to 75 trucks",
    features: ["receipts", "driver_app", "reports", "savings", "fuel_stops", "audit_exports"],
    featureLabels: ["Everything in Growth", "Route planning", "Audit-ready exports"],
    cta: "Get started",
    selfServe: true,
    featured: false,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthly: null,
    annual: null,
    maxTrucks: null,
    fleet: "76+ trucks",
    features: [
      "receipts",
      "driver_app",
      "reports",
      "savings",
      "fuel_stops",
      "audit_exports",
      "auditors",
      "review_rules",
    ],
    featureLabels: ["Custom fleet size", "Review rules and auditors", "Priority onboarding"],
    cta: "Talk to us",
    selfServe: false,
    featured: false,
  },
};

export const PLAN_LIST = PLAN_IDS.map((id) => PLANS[id]);

export function parsePlanId(value: string | null | undefined): PlanId | null {
  if (!value) return null;
  const id = value.trim().toLowerCase();
  return PLAN_IDS.includes(id as PlanId) ? (id as PlanId) : null;
}

export function parseBillingInterval(value: string | null | undefined): BillingInterval {
  return value === "year" || value === "annual" ? "year" : "month";
}

export function signupHref(plan: PlanDefinition, interval: BillingInterval) {
  const params = new URLSearchParams({ plan: plan.id });
  if (interval === "year") params.set("period", "annual");
  return `/signup?${params.toString()}`;
}

export function planHasFeature(planId: PlanId | null | undefined, feature: PlanFeature) {
  const plan = planId ? PLANS[planId] : null;
  if (!plan) return false;
  return plan.features.includes(feature);
}
