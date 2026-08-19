import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AuthError } from "@/lib/auth/errors";
import { canMutateReceipt, canViewReceipt, canWriteFleet, storagePathBelongsToOrg } from "./isolation";
import { storageOriginalPath } from "@/lib/receipts/paths";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const DRIVER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const DRIVER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("tenant isolation", () => {
  it("keeps original receipt files under the owning organization prefix", () => {
    const path = storageOriginalPath({
      organizationId: ORG_A,
      truckId: "truck-1",
      receiptId: "receipt-1",
      purchasedAt: new Date("2026-08-01T12:00:00Z"),
      ext: "jpg",
    });
    expect(storagePathBelongsToOrg(path, ORG_A)).toBe(true);
    expect(storagePathBelongsToOrg(path, ORG_B)).toBe(false);
    expect(storagePathBelongsToOrg(`../${ORG_A}/secret.jpg`, ORG_A)).toBe(false);
  });

  it("denies managers and drivers from another company", () => {
    const receipt = { organization_id: ORG_A, driver_id: DRIVER_A };
    expect(
      canViewReceipt({
        role: "manager",
        userId: DRIVER_B,
        organizationId: ORG_B,
        receipt,
      }),
    ).toBe(false);
    expect(
      canViewReceipt({
        role: "driver",
        userId: DRIVER_B,
        organizationId: ORG_A,
        receipt,
      }),
    ).toBe(false);
    expect(
      canViewReceipt({
        role: "driver",
        userId: DRIVER_A,
        organizationId: ORG_A,
        receipt,
      }),
    ).toBe(true);
    expect(
      canViewReceipt({
        role: "auditor",
        userId: DRIVER_B,
        organizationId: ORG_A,
        receipt,
      }),
    ).toBe(true);
  });

  it("lets auditors read but not change fleet or receipts", () => {
    expect(canMutateReceipt("auditor")).toBe(false);
    expect(canWriteFleet("auditor")).toBe(false);
    expect(canMutateReceipt("manager")).toBe(true);
    expect(canWriteFleet("owner_admin")).toBe(true);
  });

  it("throws a forbidden error when a row belongs to another org", async () => {
    const { assertOrgOwned } = await import("./isolation");
    expect(() => assertOrgOwned({ organization_id: ORG_B }, ORG_A)).toThrow(AuthError);
    expect(assertOrgOwned({ organization_id: ORG_A, id: "ok" }, ORG_A).id).toBe("ok");
  });

  it("scopes tenant tables with current_org_id or is_org_staff policies", () => {
    const rls = readFileSync("supabase/migrations/20260818120001_rls.sql", "utf8");
    const staff = readFileSync("supabase/migrations/20260819211000_phase2_auditor_staff.sql", "utf8");
    expect(rls).toContain("current_org_id()");
    expect(rls).toContain("organization_id = public.current_org_id()");
    expect(staff).toContain("is_org_staff");
    expect(staff).toContain("role in ('owner_admin', 'manager', 'auditor')");
    expect(staff).toContain("is_manager(organization_id)");
  });
});
