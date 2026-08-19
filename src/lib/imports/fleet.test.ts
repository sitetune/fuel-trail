import { describe, expect, it } from "vitest";
import { autoMapHeaders, fleetTemplateCsv, previewFleetCsv } from "./fleet";

describe("fleet import", () => {
  it("maps common truck column aliases", () => {
    expect(autoMapHeaders(["Unit #", "VIN", "Fuel"], ["unit_number", "vin", "fuel_type"])).toEqual({
      unit_number: "Unit #",
      vin: "VIN",
      fuel_type: "Fuel",
    });
  });

  it("previews a valid truck template", () => {
    const result = previewFleetCsv({ text: fleetTemplateCsv("trucks"), kind: "trucks" });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].error).toBeNull();
    expect(result.rows[0].normalized?.unit_number).toBe("101");
  });

  it("flags missing driver emails", () => {
    const result = previewFleetCsv({
      text: "full_name,email\nAlex,\n",
      kind: "drivers",
    });
    expect(result.rows[0].error).toBeTruthy();
  });
});
