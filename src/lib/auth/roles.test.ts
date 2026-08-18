import { describe, expect, it } from "vitest";
import {
  canManageOrgSettings,
  canManageUsers,
  homePathForRole,
  isManagementRole,
} from "./roles";

describe("roles", () => {
  it("routes drivers and managers separately", () => {
    expect(homePathForRole("driver")).toBe("/driver");
    expect(homePathForRole("manager")).toBe("/manage");
    expect(isManagementRole("owner_admin")).toBe(true);
    expect(isManagementRole("driver")).toBe(false);
  });
  it("reserves org security for the owner", () => {
    expect(canManageUsers("manager")).toBe(false);
    expect(canManageOrgSettings("owner_admin")).toBe(true);
  });
});
