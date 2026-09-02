"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rethrowIfNextRedirect } from "@/lib/auth/redirect-error";
import { AuthError, getSessionUser, redirectForUser } from "@/lib/auth/session";
import { parsePlanId, PLANS } from "@/lib/billing/plans";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { createOrganizationAccount, signupSchema } from "@/lib/orgs/signup";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect("/login?error=invalid");
  }
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    rethrowIfNextRedirect(error);
    if (error instanceof AuthError && error.code === "pending") redirect("/waiting");
    if (error instanceof AuthError && error.code === "inactive") redirect("/login?error=inactive");
    redirect("/login?error=invalid");
  }
  if (!user) redirect("/login?error=inactive");
  redirect(redirectForUser(user));
}

export async function signUpAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    companyName: formData.get("companyName"),
    timezone: formData.get("timezone") || "America/Chicago",
    baseJurisdiction: String(formData.get("baseJurisdiction") || "").trim() || undefined,
    plan: String(formData.get("plan") || "") || undefined,
    period: String(formData.get("period") || "") || undefined,
  });
  if (!parsed.success || !parsePlanId(parsed.data.plan)) {
    const plan = String(formData.get("plan") || "");
    const period = String(formData.get("period") || "");
    const retry = new URLSearchParams();
    retry.set("error", parsed.success ? "plan" : "invalid");
    if (plan) retry.set("plan", plan);
    if (period) retry.set("period", period);
    redirect(`/signup?${retry.toString()}`);
  }
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("bucket", "signup")
    .gte("created_at", since);
  if ((count ?? 0) >= 20) redirect("/signup?error=rate");
  await admin.from("rate_limit_events").insert({ bucket: "signup" });
  let created;
  try {
    created = await createOrganizationAccount(parsed.data);
  } catch {
    redirect("/signup?error=create");
  }
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (created.planId && PLANS[created.planId].selfServe) {
    try {
      const session = await createCheckoutSession({
        organizationId: created.organizationId,
        email: parsed.data.email,
        planId: created.planId,
        interval: created.interval,
        returnTo: "waiting",
      });
      if (session.url) redirect(session.url);
    } catch {
      redirect("/waiting?error=billing");
    }
  }
  redirect(created.status === "active" ? "/manage/setup" : "/waiting");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/update-password`,
  });
  redirect("/reset-password?sent=1");
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/update-password?error=1");
  const user = await getSessionUser();
  redirect(user ? redirectForUser(user) : "/login");
}
