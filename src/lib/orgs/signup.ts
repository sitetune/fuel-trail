import { z } from "zod";
import { parseBillingInterval, parsePlanId, PLANS, type BillingInterval, type PlanId } from "@/lib/billing/plans";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { organizationSlug } from "@/lib/orgs/status";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(10).max(72),
  companyName: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(3).default("America/Chicago"),
  baseJurisdiction: z.string().trim().length(2).optional(),
  plan: z.string().optional(),
  period: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

function signupBilling(input: SignupInput): {
  planId: PlanId | null;
  interval: BillingInterval;
  status: "active" | "pending_activation";
  billingStatus: "none" | "pending" | "active";
} {
  const planId = parsePlanId(input.plan);
  const interval = parseBillingInterval(input.period);
  const autoActivate = process.env.SIGNUP_AUTO_ACTIVATE !== "false";
  if (planId && (PLANS[planId].selfServe || planId === "enterprise")) {
    return { planId, interval, status: "pending_activation", billingStatus: "pending" };
  }
  return {
    planId,
    interval,
    status: autoActivate ? "active" : "pending_activation",
    billingStatus: autoActivate ? "none" : "pending",
  };
}

export async function createOrganizationAccount(input: SignupInput) {
  const admin = createServiceRoleClient();
  const billing = signupBilling(input);
  const slug = organizationSlug(input.companyName);
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: input.companyName,
      slug,
      timezone: input.timezone,
      base_jurisdiction: input.baseJurisdiction?.toUpperCase() ?? null,
      status: billing.status,
      plan_id: billing.planId,
      billing_interval: billing.planId ? billing.interval : null,
      billing_status: billing.billingStatus,
      primary_contact_name: input.fullName,
      primary_contact_email: input.email,
    })
    .select("id, status")
    .single();
  if (orgError || !org) {
    throw new Error("Could not create the company. Try a slightly different company name.");
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      role: "owner_admin",
      organization_id: org.id,
    },
  });
  if (error || !data.user) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(error?.message ?? "Could not create the owner account.");
  }
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    organization_id: org.id,
    full_name: input.fullName,
    email: input.email,
    role: "owner_admin",
    is_active: true,
  });
  if (profileError) {
    throw new Error("Account was created but the profile could not be saved. Contact support.");
  }
  await admin.from("app_audit_events").insert({
    organization_id: org.id,
    actor_id: data.user.id,
    entity_type: "organization",
    entity_id: org.id,
    event_type: "organization_created",
    metadata: { slug, status: org.status },
  });
  return {
    organizationId: org.id as string,
    userId: data.user.id,
    status: org.status as string,
    planId: billing.planId,
    interval: billing.interval,
  };
}
