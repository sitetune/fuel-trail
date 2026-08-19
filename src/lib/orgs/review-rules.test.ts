import { describe, expect, it } from "vitest";
import { parseReviewRules, serializeReviewRules } from "./review-rules";

describe("review rules", () => {
  it("defaults missing flags to off", () => {
    expect(parseReviewRules(null)).toEqual({
      requireOdometer: false,
      requireReceiptNumber: false,
      requirePaymentLast4: false,
      requireTankLevel: false,
    });
  });

  it("round-trips snake_case storage", () => {
    const parsed = parseReviewRules({ require_odometer: true, require_receipt_number: true });
    expect(parsed.requireOdometer).toBe(true);
    expect(serializeReviewRules(parsed)).toMatchObject({
      require_odometer: true,
      require_receipt_number: true,
    });
  });
});
