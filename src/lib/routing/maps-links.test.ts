import { describe, expect, it } from "vitest";
import { buildMapsLinks } from "./maps-links";

describe("buildMapsLinks", () => {
  it("builds Google, Apple, Waze, and geo URLs for a labeled stop", () => {
    const links = buildMapsLinks({ lat: 29.7355, lng: -94.9774, label: "Pilot Baytown" });
    expect(links.google).toContain("destination=29.7355,-94.9774");
    expect(links.apple).toContain("daddr=29.7355,-94.9774");
    expect(links.waze).toContain("ll=29.7355,-94.9774");
    expect(links.waze).toContain("navigate=yes");
    expect(links.geo).toMatch(/^geo:29.7355,-94.9774/);
    expect(links.apple).toContain(encodeURIComponent("Pilot Baytown"));
  });
});
