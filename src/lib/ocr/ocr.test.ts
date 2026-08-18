import { describe, expect, it } from "vitest";
import { gallonsFromLineItems, normalizeMindeePrediction } from "./mindee";
import { emptyExtraction } from "./types";

describe("OCR normalization", () => {
  it("returns empty extraction for invalid payloads", () => {
    const result = normalizeMindeePrediction({ unexpected: true });
    expect(result.merchantName.value).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("maps Mindee fields and still requires gallons confirmation", () => {
    const result = normalizeMindeePrediction({
      document: {
        id: "doc-1",
        inference: {
          prediction: {
            supplier_name: { value: "Pilot", confidence: 0.9 },
            supplier_address: { value: "550 I-10, Baytown, TX 77521", confidence: 0.8 },
            date: { value: "2026-08-01", confidence: 0.9 },
            time: { value: "13:15", confidence: 0.7 },
            total_amount: { value: 349.9, confidence: 0.95 },
            line_items: [{ description: "Soda", quantity: 1 }],
          },
        },
      },
    });
    expect(result.merchantName.value).toBe("Pilot");
    expect(result.merchantRegion.value).toBe("TX");
    expect(result.gallons.value).toBeNull();
    expect(result.warnings.some((warning) => /Gallons/.test(warning))).toBe(true);
  });

  it("reads gallons from line items", () => {
    expect(
      gallonsFromLineItems([{ description: "ULSD DIESEL 112.500 GAL", quantity: 112.5 }]).gallons,
    ).toBe(112.5);
  });

  it("manual provider message is explicit", () => {
    const empty = emptyExtraction("manual", ["manual-entry"]);
    expect(empty.provider).toBe("manual");
    expect(empty.totalAmount.value).toBeNull();
  });
});
