import type { Organization } from "@/types/domain";
import { PLANS, parsePlanId, type PlanFeature, type PlanId } from "./plans";

export type PlanAction =
  | "add_truck"
  | "invite_user"
  | "invite_auditor"
  | "reports"
  | "savings"
  | "fuel_stops"
  | "audit_exports";

export class PlanLimitError extends Error {
  code = "plan_locked" as const;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

const ACTION_FEATURE: Partial<Record<PlanAction, PlanFeature>> = {
  reports: "reports",
  savings: "savings",
  fuel_stops: "fuel_stops",
  audit_exports: "audit_exports",
  invite_auditor: "auditors",
};

const UPGRADE_COPY: Record<PlanAction, string> = {
  add_truck: "This plan is at its truck limit. Upgrade to add more trucks.",
  invite_user: "Upgrade your plan to invite more people.",
  invite_auditor: "Auditor seats are available on Enterprise. Talk to us to unlock them.",
  reports: "Reports unlock on Growth. Upgrade to open this page.",
  savings: "Savings unlocks on Growth. Upgrade to open this page.",
  fuel_stops: "Fuel stop planning unlocks on Fleet. Upgrade to open this page.",
  audit_exports: "Audit exports unlock on Fleet. Upgrade to download them.",
};

export function orgPlanId(org: Pick<Organization, "plan_id" | "status">): PlanId | null {
  const parsed = parsePlanId(org.plan_id);
  if (parsed) return parsed;
  return org.status === "active" ? "fleet" : null;
}

export function assertPlanAllows(
  org: Pick<Organization, "plan_id" | "status" | "billing_status">,
  action: PlanAction,
  extra?: { activeTruckCount?: number; addCount?: number },
) {
  const planId = orgPlanId(org);
  const plan = planId ? PLANS[planId] : null;
  if (!plan) {
    throw new PlanLimitError("Choose a plan to use this part of FuelTrail.");
  }
  const feature = ACTION_FEATURE[action];
  if (feature && !plan.features.includes(feature)) {
    throw new PlanLimitError(UPGRADE_COPY[action]);
  }
  if (action === "add_truck") {
    const add = extra?.addCount ?? 1;
    const current = extra?.activeTruckCount ?? 0;
    if (plan.maxTrucks != null && current + add > plan.maxTrucks) {
      throw new PlanLimitError(`This ${plan.name} plan includes ${plan.maxTrucks} trucks. Upgrade to add more.`);
    }
  }
}

export function planLimitMessage(error: unknown) {
  return error instanceof PlanLimitError ? error.message : null;
}
