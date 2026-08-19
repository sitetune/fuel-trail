import { AuthError } from "@/lib/auth/errors";
import { canMutateFleet, canVerifyReceipts, isManagementRole } from "@/lib/auth/roles";
import type { Role } from "@/types/domain";

export function assertOrgOwned<T extends { organization_id?: string | null }>(
  row: T | null | undefined,
  organizationId: string,
  message = "Not found.",
): T {
  if (!row || row.organization_id !== organizationId) {
    throw new AuthError(message, "forbidden");
  }
  return row;
}

export function storagePathBelongsToOrg(path: string, organizationId: string) {
  return path.startsWith(`${organizationId}/`) && !path.includes("..");
}

export function assertStoragePathForOrg(path: string, organizationId: string) {
  if (!storagePathBelongsToOrg(path, organizationId)) {
    throw new AuthError("Storage path is outside this organization.", "forbidden");
  }
}

export function canViewReceipt(input: {
  role: Role;
  userId: string;
  organizationId: string;
  receipt: { organization_id: string; driver_id: string };
}) {
  if (input.receipt.organization_id !== input.organizationId) return false;
  if (isManagementRole(input.role)) return true;
  return input.receipt.driver_id === input.userId;
}

export function canMutateReceipt(role: Role) {
  return canVerifyReceipts(role);
}

export function canWriteFleet(role: Role) {
  return canMutateFleet(role);
}
