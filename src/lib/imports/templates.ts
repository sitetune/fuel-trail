import { fleetTemplateCsv, type FleetImportKind } from "@/lib/imports/fleet";
import { FUEL_PRICE_CSV_HEADERS } from "@/lib/reports/csv";

export const IMPORT_TEMPLATE_KINDS = ["trucks", "drivers", "assignments", "fuel-prices"] as const;
export type ImportTemplateKind = (typeof IMPORT_TEMPLATE_KINDS)[number];

export function fuelPriceTemplateCsv() {
  return `\uFEFF${FUEL_PRICE_CSV_HEADERS.join(",")}\r\nPilot Travel Center,550 Interstate 10,Baytown,TX,77521,29.7355,-94.9774,3.459,diesel,2026-08-01T12:00:00Z,yes,yes,stay_attached,,\r\n`;
}

export function importTemplateCsv(kind: ImportTemplateKind) {
  if (kind === "fuel-prices") return fuelPriceTemplateCsv();
  return `\uFEFF${fleetTemplateCsv(kind as FleetImportKind)}`;
}

export function importTemplateFilename(kind: ImportTemplateKind) {
  return `fueltrail-${kind}-template.csv`;
}

export function csvFileResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
