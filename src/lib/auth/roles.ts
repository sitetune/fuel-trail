import type { Role } from "@/types/domain";

export function isManagementRole(role: Role): boolean {
  return role === "owner_admin" || role === "manager";
}

export function isOwnerAdmin(role: Role): boolean {
  return role === "owner_admin";
}

export function canManageUsers(role: Role): boolean {
  return role === "owner_admin";
}

export function canManageOrgSettings(role: Role): boolean {
  return role === "owner_admin";
}

export function canVerifyReceipts(role: Role): boolean {
  return isManagementRole(role);
}

export function canCaptureReceipts(role: Role): boolean {
  return role === "driver" || isManagementRole(role);
}

export function homePathForRole(role: Role): string {
  return role === "driver" ? "/driver" : "/manage";
}
