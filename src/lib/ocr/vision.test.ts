import { describe, expect, it } from "vitest";
import { visionPayloadToExtraction } from "./vision";

describe("visionPayloadToExtraction", () => {
  it("keeps extra keys and messy number strings", () => {
    const result = visionPayloadToExtraction({
      merchantName: "Pilot",
      merchantAddress: "1860 East Napier Ave.",
      merchantCity: "Benton Harbor",
      merchantRegion: "Michigan",
      merchantPostalCode: 49022,
      purchasedAt: "01/30/2021",
      receiptNumber: 99352831,
      gallons: "182.331 gal",
      pricePerGallon: "$2.859",
      totalAmount: "521.29",
      storeNumber: 666,
      warnings: null,
    });
    expect(result.merchantName.value).toBe("Pilot");
    expect(result.merchantCity.value).toBe("Benton Harbor");
    expect(result.merchantRegion.value).toBe("MI");
    expect(result.merchantPostalCode.value).toBe("49022");
    expect(result.purchasedAt.value).toMatch(/^2021-01-30T/);
    expect(result.receiptNumber.value).toBe("99352831");
    expect(result.gallons.value).toBeCloseTo(182.331);
    expect(result.pricePerGallon.value).toBe(2.859);
    expect(result.totalAmount.value).toBe(521.29);
    expect(result.warnings.join(" ")).not.toMatch(/unexpected result/i);
  });

  it("unwraps nested Gemini payloads instead of throwing them away", () => {
    const result = visionPayloadToExtraction({
      data: [
        {
          merchant: "Love's",
          city: "Knoxville",
          state: "TN",
          address: "5516 Lonas Rd.",
          zip: "37919",
          date: "2011-09-23",
          gallons: { value: 4.137 },
          total: 11.08,
          price_per_gallon: 2.679,
        },
      ],
    });
    expect(result.merchantName.value).toBe("Love's");
    expect(result.merchantRegion.value).toBe("TN");
    expect(result.gallons.value).toBe(4.137);
    expect(result.totalAmount.value).toBe(11.08);
    expect(result.purchasedAt.value).toBe("2011-09-23T12:00:00");
  });

  it("keeps snake_case JSON even when warnings is null", () => {
    const result = visionPayloadToExtraction({
      merchant_name: "Pilot",
      merchant_address: "1860 East Napier Ave.",
      merchant_city: "Benton Harbor",
      merchant_region: "Michigan",
      merchant_postal_code: "49022",
      purchased_at: "01/30/2021",
      receipt_number: "99352831",
      gallons: 182.331,
      price_per_gallon: 2.859,
      total_amount: 521.29,
      fuel_type: "diesel",
      warnings: null,
      storeNumber: 666,
    });
    expect(result.merchantName.value).toBe("Pilot");
    expect(result.merchantRegion.value).toBe("MI");
    expect(result.purchasedAt.value).toMatch(/^2021-01-30T/);
    expect(result.receiptNumber.value).toBe("99352831");
    expect(result.totalAmount.value).toBe(521.29);
    expect(result.warnings.join(" ")).not.toMatch(/unexpected result/i);
  });

  it("does not turn Tennessee into TE", () => {
    const result = visionPayloadToExtraction({
      merchantName: "Pilot",
      merchantRegion: "Tennessee",
      gallons: 4.137,
      totalAmount: 11.08,
    });
    expect(result.merchantRegion.value).toBe("TN");
  });
});
