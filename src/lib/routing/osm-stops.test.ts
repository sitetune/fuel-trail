import { describe, expect, it } from "vitest";
import { attachOrgPrices, isTruckFriendlyStop, parseNominatimFuelResults, parseOverpassElements } from "./osm-stops";

describe("parseOverpassElements", () => {
  it("marks HGV-tagged and known truck-stop brands", () => {
    const stops = parseOverpassElements([
      {
        type: "node",
        id: 1,
        lat: 29.74,
        lon: -94.98,
        tags: { amenity: "fuel", name: "Corner Store", "fuel:diesel": "yes" },
      },
      {
        type: "node",
        id: 2,
        lat: 29.75,
        lon: -94.97,
        tags: { amenity: "fuel", name: "Pilot Travel Center", hgv: "yes", brand: "Pilot" },
      },
    ]);
    expect(stops).toHaveLength(2);
    expect(stops[0]?.truckFriendly).toBe(false);
    expect(stops[0]?.diesel).toBe(true);
    expect(stops[1]?.truckFriendly).toBe(true);
    expect(isTruckFriendlyStop(stops[1]!)).toBe(true);
  });
});

describe("attachOrgPrices", () => {
  it("matches a nearby org station price onto an OSM stop", () => {
    const osm = parseOverpassElements([
      { type: "node", id: 9, lat: 29.7355, lon: -94.9774, tags: { name: "Pilot", amenity: "fuel" } },
    ]);
    const merged = attachOrgPrices(
      osm,
      [{ id: "org-1", name: "Pilot Baytown", latitude: 29.7356, longitude: -94.9775, price: 3.19, observedAt: "2026-08-24T12:00:00Z" }],
      { lat: 29.7355, lng: -94.9774 },
    );
    expect(merged[0]?.price).toBe(3.19);
    expect(merged[0]?.orgStationId).toBe("org-1");
  });

  it("keeps org stations when OpenStreetMap returns nothing", () => {
    const merged = attachOrgPrices(
      [],
      [{ id: "org-1", name: "Pilot Baytown", latitude: 29.7355, longitude: -94.9774, price: 3.19 }],
      { lat: 29.7355, lng: -94.9774 },
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("org");
    expect(merged[0]?.miles).toBe(0);
  });
});

describe("parseNominatimFuelResults", () => {
  it("keeps named truck stops and drops unrelated hits", () => {
    const stops = parseNominatimFuelResults([
      {
        lat: "29.74",
        lon: "-94.98",
        name: "Pilot Travel Center",
        display_name: "Pilot Travel Center, Baytown, TX",
        class: "amenity",
        type: "fuel",
        osm_id: 11,
        osm_type: "node",
      },
      { lat: "29.75", lon: "-94.97", name: "City Hall", display_name: "City Hall, Baytown, TX", class: "office", type: "government" },
    ]);
    expect(stops).toHaveLength(1);
    expect(stops[0]?.name).toBe("Pilot Travel Center");
    expect(isTruckFriendlyStop(stops[0]!)).toBe(true);
  });
});
