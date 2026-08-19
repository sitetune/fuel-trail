import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { organizationSlug } from "@/lib/orgs/status";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z.string().min(10).max(72),
  companyName: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(3).default("America/Chicago"),
  baseJurisdiction: z.string().trim().length(2).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export async function createOrganizationAccount(input: SignupInput) {
  const admin = createServiceRoleClient();
  const autoActivate = process.env.SIGNUP_AUTO_ACTIVATE !== "false";
  const slug = organizationSlug(input.companyName);
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: input.companyName,
      slug,
      timezone: input.timezone,
      base_jurisdiction: input.baseJurisdiction?.toUpperCase() ?? null,
      status: autoActivate ? "active" : "pending_activation",
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
  return { organizationId: org.id as string, userId: data.user.id, status: org.status as string };
}
