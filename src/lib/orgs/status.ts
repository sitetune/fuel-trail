export function organizationSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base || "fleet"}-${suffix}`;
}

export function isPlatformAdminEmail(email: string | null | undefined, allowList = process.env.PLATFORM_ADMIN_EMAILS) {
  if (!email) return false;
  const allowed = (allowList ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export type OrgStatus = "pending_activation" | "active" | "deactivated";

export function orgIsUsable(status: string | null | undefined) {
  return status === "active" || status == null || status === "";
}
