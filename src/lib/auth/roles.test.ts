import { describe, expect, it } from "vitest";
import {
  canInvitePeople,
  canManageOrgProfile,
  canManageOrgSettings,
  canManageUsers,
  canMutateFleet,
  canVerifyReceipts,
  homePathForRole,
  isManagementRole,
} from "./roles";

describe("roles", () => {
  it("routes drivers and managers separately", () => {
    expect(homePathForRole("driver")).toBe("/driver");
    expect(homePathForRole("manager")).toBe("/manage");
    expect(isManagementRole("owner_admin")).toBe(true);
    expect(isManagementRole("auditor")).toBe(true);
    expect(canVerifyReceipts("auditor")).toBe(false);
    expect(canMutateFleet("manager")).toBe(true);
    expect(canMutateFleet("auditor")).toBe(false);
  });
  it("lets managers invite drivers and edit company profile, not security", () => {
    expect(canManageUsers("manager")).toBe(false);
    expect(canInvitePeople("manager")).toBe(true);
    expect(canManageOrgProfile("manager")).toBe(true);
    expect(canManageOrgSettings("manager")).toBe(false);
    expect(canManageOrgSettings("owner_admin")).toBe(true);
  });
});
