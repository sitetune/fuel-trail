import { describe, expect, it } from "vitest";
import { groupAvgFuelByTruck } from "./avg-fuel";

const rows = [
  {
    unitNumber: "101",
    driverName: "Alex Driver",
    purchasedAt: "2026-08-18T16:00:00Z",
    gallons: 80,
    total: 280,
  },
  {
    unitNumber: "101",
    driverName: "Alex Driver",
    purchasedAt: "2026-08-20T16:00:00Z",
    gallons: 100,
    total: 350,
  },
  {
    unitNumber: "202",
    driverName: "Blair Driver",
    purchasedAt: "2026-07-02T16:00:00Z",
    gallons: 50,
    total: 175,
  },
];

describe("groupAvgFuelByTruck", () => {
  it("rolls two August fills into one monthly row with weighted avg price", () => {
    const grouped = groupAvgFuelByTruck({ rows, timezone: "America/Chicago", period: "month" });
    const truck101 = grouped.find((row) => row.unitNumber === "101");
    expect(truck101?.gallons).toBe(180);
    expect(truck101?.spend).toBe(630);
    expect(truck101?.avgPrice).toBe(3.5);
    expect(truck101?.receipts).toBe(2);
    expect(truck101?.driverNames).toEqual(["Alex Driver"]);
    expect(truck101?.periodLabel).toMatch(/Aug 2026/);
  });

  it("keeps separate weekly buckets", () => {
    const split = groupAvgFuelByTruck({
      rows: [
        { ...rows[0], purchasedAt: "2026-08-16T16:00:00Z" },
        { ...rows[1], purchasedAt: "2026-08-24T16:00:00Z" },
      ],
      timezone: "America/Chicago",
      period: "week",
    });
    expect(split).toHaveLength(2);
  });

  it("rolls the year together", () => {
    const grouped = groupAvgFuelByTruck({ rows, timezone: "America/Chicago", period: "year" });
    expect(grouped.some((row) => row.unitNumber === "101" && row.periodKey === "2026" && row.gallons === 180)).toBe(
      true,
    );
  });
});
