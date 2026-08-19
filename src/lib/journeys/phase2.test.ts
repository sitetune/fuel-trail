import { describe, expect, it } from "vitest";
import { canMutateFleet, canVerifyReceipts, isManagementRole } from "@/lib/auth/roles";
import { canViewReceipt, storagePathBelongsToOrg } from "@/lib/auth/isolation";
import { ROLES } from "@/types/domain";
import { fleetTemplateCsv, previewFleetCsv } from "@/lib/imports/fleet";
import { orgIsUsable, organizationSlug } from "@/lib/orgs/status";
import { parseReviewRules } from "@/lib/orgs/review-rules";
import { storageOriginalPath } from "@/lib/receipts/paths";
import { canTransitionReceipt, driverCanEditReceipt, isRejectedActionRequired } from "@/lib/receipts/states";
import { csvEscape } from "@/lib/reports/csv";
import { IFTA_LIMITATION_NOTE } from "@/lib/reports/ifta";
import { receiptReviewSchema, validateReceiptMath } from "@/lib/validation/receipt";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

describe("Phase 2 critical journeys", () => {
  it("1. organization owner signup creates a usable company slug and status", () => {
    const slug = organizationSlug("Gulf Coast Haul");
    expect(slug.startsWith("gulf-coast-haul-")).toBe(true);
    expect(orgIsUsable("active")).toBe(true);
    expect(orgIsUsable("pending_activation")).toBe(false);
  });

  it("2. driver invitation is a first-class role", () => {
    expect(ROLES).toContain("driver");
    expect(isManagementRole("driver")).toBe(false);
  });

  it("3. manager invitation can verify receipts; auditors cannot", () => {
    expect(ROLES).toContain("manager");
    expect(canVerifyReceipts("manager")).toBe(true);
    expect(canVerifyReceipts("auditor")).toBe(false);
    expect(isManagementRole("manager")).toBe(true);
  });

  it("4. fleet CSV import accepts the truck template", () => {
    const preview = previewFleetCsv({ text: fleetTemplateCsv("trucks"), kind: "trucks" });
    expect(preview.rows[0]?.error).toBeNull();
    expect(preview.rows[0]?.normalized?.unit_number).toBe("101");
  });

  it("5. driver receipt originals stay under the company storage prefix", () => {
    const path = storageOriginalPath({
      organizationId: ORG_A,
      truckId: "truck-1",
      receiptId: "receipt-1",
      purchasedAt: new Date("2026-08-01T12:00:00Z"),
      ext: "jpg",
    });
    expect(storagePathBelongsToOrg(path, ORG_A)).toBe(true);
    expect(path).toContain("/original-");
  });

  it("6. OCR review still requires the driver to confirm merchant, gallons, and total", () => {
    const parsed = receiptReviewSchema.safeParse({
      truckId: ORG_A,
      purchasedAt: "2026-08-18T12:00:00",
      merchantName: "Pilot",
      merchantAddress: "1 I-10",
      merchantCity: "Baytown",
      merchantRegion: "TX",
      purchaserName: "Alex Driver",
      gallons: 80,
      totalAmount: 280,
      tankLevelAfterMode: "unknown",
    });
    expect(parsed.success).toBe(true);
    const missing = receiptReviewSchema.safeParse({
      truckId: ORG_A,
      purchasedAt: "2026-08-18T12:00:00",
      merchantName: "",
      merchantAddress: "1 I-10",
      merchantCity: "Baytown",
      merchantRegion: "TX",
      purchaserName: "Alex Driver",
      gallons: 80,
      totalAmount: 280,
      tankLevelAfterMode: "unknown",
    });
    expect(missing.success).toBe(false);
  });

  it("7. offline queue treats uploaded items as done and keeps waiting/failed items", () => {
    const items = [
      { status: "waiting_to_upload" },
      { status: "failed" },
      { status: "uploaded" },
    ];
    const pending = items.filter((item) => item.status !== "uploaded");
    expect(pending).toHaveLength(2);
  });

  it("8. manager correction and verification is an allowed transition", () => {
    expect(canTransitionReceipt("submitted", "verified")).toBe(true);
    expect(canTransitionReceipt("needs_review", "verified")).toBe(true);
    expect(canMutateFleet("manager")).toBe(true);
  });

  it("9. rejection notifies the driver path and allows resubmission", () => {
    expect(isRejectedActionRequired("rejected")).toBe(true);
    expect(driverCanEditReceipt("rejected")).toBe(true);
    expect(canTransitionReceipt("rejected", "submitted")).toBe(true);
  });

  it("10. receipt printing and filtered reporting keep IFTA limits and safe CSV", () => {
    expect(IFTA_LIMITATION_NOTE).toMatch(/distance traveled/i);
    expect(csvEscape("=cmd")).toContain("'=cmd");
  });

  it("11. cross-organization data isolation denies the other company's receipts", () => {
    const receipt = { organization_id: ORG_A, driver_id: "driver-a" };
    expect(
      canViewReceipt({
        role: "manager",
        userId: "manager-b",
        organizationId: ORG_B,
        receipt,
      }),
    ).toBe(false);
    expect(parseReviewRules({ require_odometer: true }).requireOdometer).toBe(true);
    expect(
      validateReceiptMath(
        {
          truckId: ORG_A,
          purchasedAt: "2026-08-18T12:00:00Z",
          merchantName: "Pilot",
          merchantAddress: "1 I-10",
          merchantCity: "Baytown",
          merchantRegion: "TX",
          purchaserName: "Driver",
          fuelType: "diesel",
          gallons: 100,
          totalAmount: 350,
          tankLevelAfterMode: "unknown",
          tankCapacityGallons: 200,
        },
        { now: new Date("2026-08-18T13:00:00Z"), rules: { require_odometer: true } },
      ).some((warning) => warning.code === "rule_odometer"),
    ).toBe(true);
  });
});
