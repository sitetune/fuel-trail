import { describe, expect, it } from "vitest";
import { importTemplateCsv, IMPORT_TEMPLATE_KINDS } from "./templates";
import { previewFleetCsv } from "./fleet";

describe("import templates", () => {
  it("contains every advertised template", () => {
    expect(IMPORT_TEMPLATE_KINDS).toEqual(["trucks", "drivers", "assignments", "fuel-prices"]);
  });

  it("produces a truck CSV that the importer accepts", () => {
    const csv = importTemplateCsv("trucks");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const preview = previewFleetCsv({ text: csv, kind: "trucks" });
    expect(preview.rows[0]?.error).toBeNull();
  });
});
