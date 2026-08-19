import { describe, expect, it } from "vitest";
import {
  assertReceiptTransition,
  canTransitionReceipt,
  driverCanEditReceipt,
  isRejectedActionRequired,
  receiptStatusLabel,
} from "./states";

describe("receipt state machine", () => {
  it("labels rejected receipts as action required", () => {
    expect(receiptStatusLabel("rejected")).toBe("Rejected — Action Required");
    expect(isRejectedActionRequired("rejected")).toBe(true);
  });

  it("allows a driver to resubmit a rejected receipt", () => {
    expect(canTransitionReceipt("rejected", "submitted")).toBe(true);
    expect(canTransitionReceipt("rejected", "needs_review")).toBe(true);
    expect(driverCanEditReceipt("rejected")).toBe(true);
  });

  it("does not allow a driver-style jump from verified to submitted", () => {
    expect(canTransitionReceipt("verified", "submitted")).toBe(false);
    expect(() => assertReceiptTransition("verified", "submitted")).toThrow(/cannot move/i);
  });

  it("lets a manager verify or reject a submitted receipt", () => {
    expect(canTransitionReceipt("submitted", "verified")).toBe(true);
    expect(canTransitionReceipt("submitted", "rejected")).toBe(true);
  });
});
