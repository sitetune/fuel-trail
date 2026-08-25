import { describe, expect, it } from "vitest";
import { abbreviateState, buildStopLocationHint, parseExitRef, parseHighwayRef } from "./location-hint";

describe("parseHighwayRef", () => {
  it("normalizes interstate, US, and FM names", () => {
    expect(parseHighwayRef("550 Interstate 10")).toBe("I-10");
    expect(parseHighwayRef("I-45 Frontage")).toBe("I-45");
    expect(parseHighwayRef("19711 US-59")).toBe("US-59");
    expect(parseHighwayRef("Farm to Market Road 1960")).toBe("FM 1960");
  });
});

describe("parseExitRef", () => {
  it("reads an exit number", () => {
    expect(parseExitRef("I-10 Exit 787, Baytown")).toBe("Exit 787");
  });
});

describe("buildStopLocationHint", () => {
  it("keeps a stored street address and city, and adds I-10 when the street already names the interstate", () => {
    const hint = buildStopLocationHint({
      name: "Pilot Travel Center Baytown",
      addressLine: "550 Interstate 10",
      locality: "Baytown, TX",
    });
    expect(hint.addressLine).toBe("550 Interstate 10");
    expect(hint.locality).toBe("Baytown, TX");
    expect(hint.highwayLine).toBeNull();
  });

  it("fills street, highway, and city from a reverse lookup when the stop is only a brand name", () => {
    const hint = buildStopLocationHint({
      name: "Love's Travel Stop",
      reverse: {
        displayName: "Love's Travel Stop, 550 Interstate 10, Baytown, Harris County, Texas, 77521, United States",
        houseNumber: "550",
        road: "Interstate 10",
        city: "Baytown",
        state: "Texas",
        postcode: "77521",
        suburb: "Mont Belvieu",
      },
    });
    expect(hint.addressLine).toBe("550 Interstate 10");
    expect(hint.highwayLine).toBe("I-10 at Mont Belvieu");
    expect(hint.locality).toBe("Baytown, TX");
    expect(abbreviateState("Texas")).toBe("TX");
  });

  it("does not repeat the stop name as the address", () => {
    const hint = buildStopLocationHint({
      name: "Conroe, TX",
      locality: "Conroe, TX",
    });
    expect(hint.addressLine).toBeNull();
    expect(hint.locality).toBeNull();
  });
});
