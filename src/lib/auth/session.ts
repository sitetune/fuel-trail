import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Organization, Profile, SessionUser } from "@/types/domain";
import { homePathForRole, isManagementRole, canMutateFleet } from "@/lib/auth/roles";
import { AuthError } from "@/lib/auth/errors";
import { isPlatformAdminEmail, orgIsUsable } from "@/lib/orgs/status";

export { AuthError } from "@/lib/auth/errors";

export async function getSessionUser(options?: { allowPending?: boolean }): Promise<SessionUser | null> {
  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return null;
  }
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return null;
  }
  const userId = String(data.claims.sub);
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;
  if (!profile.is_active) {
    throw new AuthError("This account has been deactivated.", "inactive");
  }
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();
  if (!organization) return null;
  const status = String(organization.status ?? "active");
  if (!orgIsUsable(status) && !isPlatformAdminEmail(profile.email as string)) {
    const pendingAllowed = options?.allowPending && status === "pending_activation";
    if (!pendingAllowed) {
      throw new AuthError(
        status === "pending_activation"
          ? "This company is waiting for FuelTrail activation."
          : "This company has been deactivated.",
        status === "pending_activation" ? "pending" : "inactive",
      );
    }
  }
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);
  return {
    authUserId: userId,
    profile: profile as Profile,
    organization: organization as Organization,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Sign in required.", "unauthenticated");
  }
  return user;
}

export async function requireManagement(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isManagementRole(user.profile.role)) {
    throw new AuthError("Management access required.", "forbidden");
  }
  return user;
}

export async function requireWriteManagement(): Promise<SessionUser> {
  const user = await requireManagement();
  if (!canMutateFleet(user.profile.role)) {
    throw new AuthError("This role is read-only.", "forbidden");
  }
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.profile.role !== "owner_admin") {
    throw new AuthError("Owner access required.", "forbidden");
  }
  return user;
}

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!isPlatformAdminEmail(user.profile.email)) {
    throw new AuthError("Platform admin access required.", "forbidden");
  }
  return user;
}

export function redirectForUser(user: SessionUser) {
  return homePathForRole(user.profile.role);
}
