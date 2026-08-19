import { describe, expect, it } from "vitest";
import { csvEscape, parseCsv, toCsv, validateFuelPriceCsv } from "./csv";
import { IFTA_LIMITATION_NOTE, iftaFuelCsv, groupIftaWorksheet } from "./ifta";

describe("csv", () => {
  it("escapes commas and quotes", () => {
    expect(csvEscape('Pilot, "the" stop')).toBe('"Pilot, ""the"" stop"');
  });
  it("neutralizes spreadsheet formula injection", () => {
    expect(csvEscape("=cmd")).toBe(`"'=cmd"`);
    expect(csvEscape("+2+2")).toBe(`"'+2+2"`);
    expect(csvEscape("-1+1")).toBe(`"'-1+1"`);
    expect(csvEscape("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
  });
  it("opens with a BOM for Excel", () => {
    expect(toCsv(["a"], [["b"]]).startsWith("\uFEFF")).toBe(true);
  });
  it("parses quoted commas", () => {
    expect(parseCsv('name,city\n"Pilot, Baytown",Baytown')).toEqual([
      ["name", "city"],
      ["Pilot, Baytown", "Baytown"],
    ]);
  });
  it("validates fuel price rows", () => {
    const csv = `station_name,address,city,state,zip,price,fuel_type,observed_at,truck_access,parking_available,trailer_policy
Pilot,1 I-10,Baytown,TX,77521,3.45,diesel,2026-08-01T12:00:00Z,yes,yes,stay_attached`;
    const result = validateFuelPriceCsv(csv);
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});

describe("IFTA csv", () => {
  it("includes the limitation note and groups by truck/jurisdiction", () => {
    const rows = [
      {
        organizationName: "Acme",
        unitNumber: "101",
        vin: null,
        driverName: "A",
        purchaserName: "A",
        purchasedAt: "2026-08-01T12:00:00Z",
        merchantName: "Pilot",
        merchantAddress: "1 I-10",
        jurisdiction: "TX",
        gallons: 100,
        fuelType: "diesel",
        pricePerGallon: 3.5,
        total: 350,
        receiptNumber: "1",
        verificationStatus: "verified",
        receiptId: "r1",
      },
      {
        organizationName: "Acme",
        unitNumber: "101",
        vin: null,
        driverName: "A",
        purchaserName: "A",
        purchasedAt: "2026-08-02T12:00:00Z",
        merchantName: "Love's",
        merchantAddress: "2 I-45",
        jurisdiction: "TX",
        gallons: 50,
        fuelType: "diesel",
        pricePerGallon: 3.4,
        total: 170,
        receiptNumber: "2",
        verificationStatus: "verified",
        receiptId: "r2",
      },
    ];
    const csv = iftaFuelCsv(rows);
    expect(csv).toContain(IFTA_LIMITATION_NOTE);
    expect(groupIftaWorksheet(rows)[0].gallons).toBe(150);
  });
});
