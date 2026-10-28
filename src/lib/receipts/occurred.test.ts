import { describe, expect, it } from "vitest";
import { receiptOccurredAt } from "./occurred";

describe("receiptOccurredAt", () => {
  it("prefers purchased_at", () => {
    const at = receiptOccurredAt({
      purchased_at: "2026-10-01T12:00:00Z",
      created_at: "2026-09-01T12:00:00Z",
    });
    expect(at?.toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  it("falls back to created_at when the pump date is missing", () => {
    const at = receiptOccurredAt({ purchased_at: null, created_at: "2026-09-02T15:00:00Z" });
    expect(at?.toISOString()).toBe("2026-09-02T15:00:00.000Z");
  });
});
