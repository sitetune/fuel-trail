import { describe, expect, it } from "vitest";
import { driverFuelStopNotificationBody, resolveDriverFuelStop } from "./driver-stop";

const basePlan = {
  id: "plan-1",
  origin_text: "Baytown, TX",
  destination_text: "Conroe, TX",
  origin_latitude: 29.7355,
  origin_longitude: -94.9774,
  destination_latitude: 30.3119,
  destination_longitude: -95.4561,
  recommended_purchase_gallons: 115,
  trailer_attached: true,
  recommendation_explanation: { explanation: "Trailer can remain attached." },
  fuel_stations: null as null,
};

describe("resolveDriverFuelStop", () => {
  it("prefers the recommended station coordinates", () => {
    const stop = resolveDriverFuelStop({
      ...basePlan,
      fuel_stations: {
        name: "Pilot Travel Center Baytown",
        address: "550 Interstate 10",
        city: "Baytown",
        region: "TX",
        postal_code: "77521",
        latitude: 29.7355,
        longitude: -94.9774,
        truck_access: "yes",
        parking_available: "yes",
        trailer_policy: "stay_attached",
        manager_notes: "Verified truck parking.",
      },
    });
    expect(stop.source).toBe("station");
    expect(stop.name).toBe("Pilot Travel Center Baytown");
    expect(stop.locality).toBe("Baytown, TX");
    expect(stop.lat).toBe(29.7355);
    expect(stop.gallons).toBe(115);
  });

  it("falls back to destination when no station is ranked", () => {
    const stop = resolveDriverFuelStop(basePlan);
    expect(stop.source).toBe("destination");
    expect(stop.name).toBe("Conroe, TX");
    expect(stop.lat).toBe(30.3119);
  });
});

describe("driverFuelStopNotificationBody", () => {
  it("names the stop, gallons, and route without filler phrases", () => {
    const stop = resolveDriverFuelStop({
      ...basePlan,
      recommended_purchase_gallons: null,
      fuel_stations: null,
    });
    const body = driverFuelStopNotificationBody(stop);
    expect(body).not.toMatch(/buy about fuel/i);
    expect(body).toContain("Stop at Conroe, TX");
    expect(body).toContain("Baytown, TX → Conroe, TX");
  });
});
