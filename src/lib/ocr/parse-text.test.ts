import { describe, expect, it } from "vitest";
import { extractionHasValues, parseFuelReceiptText } from "./parse-text";

const PILOT = `
PILOT TRAVEL CENTER #1234
550 I-10 EAST
BAYTOWN, TX 77521
08/18/2026 14:32
RECEIPT # 9876543
ULSD DIESEL
112.500 GAL @ $3.4590
FUEL TOTAL $389.14
TOTAL $389.14
`;

describe("parseFuelReceiptText", () => {
  it("fills merchant, address, date, gallons, price, and total from a truck-stop receipt", () => {
    const result = parseFuelReceiptText(PILOT);
    expect(result.merchantName.value).toMatch(/PILOT/i);
    expect(result.merchantCity.value).toBe("BAYTOWN");
    expect(result.merchantRegion.value).toBe("TX");
    expect(result.merchantPostalCode.value).toBe("77521");
    expect(result.merchantAddress.value).toMatch(/I-10/i);
    expect(result.purchasedAt.value).toBe("2026-08-18T14:32:00");
    expect(result.receiptNumber.value).toBe("9876543");
    expect(result.gallons.value).toBe(112.5);
    expect(result.pricePerGallon.value).toBe(3.459);
    expect(result.totalAmount.value).toBe(389.14);
    expect(extractionHasValues(result)).toBe(true);
  });

  it("infers price per gallon from total and gallons", () => {
    const result = parseFuelReceiptText(`
LOVE'S #234
AMARILLO TX 79101
50.000 GALLONS
TOTAL $175.00
`);
    expect(result.gallons.value).toBe(50);
    expect(result.totalAmount.value).toBe(175);
    expect(result.pricePerGallon.value).toBe(3.5);
    expect(result.pricePerGallon.source).toBe("inferred");
  });

  it("returns an empty extraction when there is no text", () => {
    const result = parseFuelReceiptText("   ");
    expect(result.merchantName.value).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
