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

  it("parses a Pilot tractor-plus-reefer ticket", () => {
    const result = parseFuelReceiptText(`
Pilot fuel and go!
Store 666
1860 East Napier Ave.
Benton Harbor, MI 49022
(269) 925-7547
01/30/2021
Receipt: 99352831
Sale
1 TrDsl $2.859 $416.66
Pump: 16
Gallons: 145.736
Price / Gal: $2.859
1 Reefer $2.859 $104.63
Gallons: 36.595
Price / Gal: $2.859
Subtotal $521.29
Sales Tax $0.00
Total $521.29
`);
    expect(result.merchantName.value).toBe("Pilot");
    expect(result.merchantAddress.value).toMatch(/Napier/i);
    expect(result.merchantCity.value).toBe("Benton Harbor");
    expect(result.merchantRegion.value).toBe("MI");
    expect(result.merchantPostalCode.value).toBe("49022");
    expect(result.purchasedAt.value).toBe("2021-01-30T12:00:00");
    expect(result.receiptNumber.value).toBe("99352831");
    expect(result.gallons.value).toBeCloseTo(182.331);
    expect(result.pricePerGallon.value).toBe(2.859);
    expect(result.totalAmount.value).toBe(521.29);
  });

  it("parses labeled gallons and ignores a federal ID", () => {
    const result = parseFuelReceiptText(`
Pilot TRAVEL CENTERS LLC.
STORE 9035
5516 Lonas Rd.
Knoxville, TN 37919
09/23/2011
Transaction #: 602439
1 Truck Diesel
Gallons: 4.137
Price / Gal: 2.679
Total 11.08
FED ID #34-1953155
`);
    expect(result.merchantName.value).toBe("Pilot");
    expect(result.merchantCity.value).toBe("Knoxville");
    expect(result.merchantRegion.value).toBe("TN");
    expect(result.purchasedAt.value).toBe("2011-09-23T12:00:00");
    expect(result.receiptNumber.value).toBe("602439");
    expect(result.gallons.value).toBe(4.137);
    expect(result.pricePerGallon.value).toBe(2.679);
    expect(result.totalAmount.value).toBe(11.08);
  });
});
