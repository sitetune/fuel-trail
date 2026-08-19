import { z } from "zod";
import { parseCsv } from "@/lib/reports/csv";

export const FLEET_IMPORT_KINDS = ["trucks", "drivers", "assignments"] as const;
export type FleetImportKind = (typeof FLEET_IMPORT_KINDS)[number];

export const TRUCK_CSV_HEADERS = [
  "unit_number",
  "vin",
  "license_plate",
  "license_state",
  "year",
  "make",
  "model",
  "fuel_type",
  "tank_capacity_gallons",
  "target_mpg",
  "week_start_min_gallons",
  "reserve_gallons",
  "notes",
  "status",
] as const;

export const DRIVER_CSV_HEADERS = ["full_name", "email", "phone", "unit_number"] as const;

export const ASSIGNMENT_CSV_HEADERS = ["email", "unit_number", "starts_at"] as const;

const HEADER_ALIASES: Record<string, string> = {
  unit: "unit_number",
  unitnumber: "unit_number",
  "unit #": "unit_number",
  "unit no": "unit_number",
  truck: "unit_number",
  "truck number": "unit_number",
  name: "full_name",
  "full name": "full_name",
  "driver name": "full_name",
  emailaddress: "email",
  "e-mail": "email",
  plate: "license_plate",
  "license plate": "license_plate",
  state: "license_state",
  fuel: "fuel_type",
  capacity: "tank_capacity_gallons",
  mpg: "target_mpg",
  reserve: "reserve_gallons",
};

export function normalizeHeader(header: string) {
  const trimmed = header.trim().toLowerCase().replaceAll("_", " ");
  const compact = trimmed.replaceAll(" ", "");
  if (HEADER_ALIASES[trimmed]) return HEADER_ALIASES[trimmed];
  if (HEADER_ALIASES[compact]) return HEADER_ALIASES[compact];
  return trimmed.replaceAll(" ", "_");
}

export function autoMapHeaders(headers: string[], expected: readonly string[]) {
  const mapping: Record<string, string> = {};
  const normalized = headers.map((header) => ({ raw: header, key: normalizeHeader(header) }));
  for (const expectedHeader of expected) {
    const match = normalized.find((header) => header.key === expectedHeader);
    if (match) mapping[expectedHeader] = match.raw;
  }
  return mapping;
}

export function headersForKind(kind: FleetImportKind) {
  if (kind === "trucks") return TRUCK_CSV_HEADERS;
  if (kind === "drivers") return DRIVER_CSV_HEADERS;
  return ASSIGNMENT_CSV_HEADERS;
}

const truckRowSchema = z.object({
  unit_number: z.string().trim().min(1),
  vin: z.string().trim().optional().nullable(),
  license_plate: z.string().trim().optional().nullable(),
  license_state: z.string().trim().max(2).optional().nullable(),
  year: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.coerce.number().int().min(1980).max(2100).nullable().optional(),
  ),
  make: z.string().trim().optional().nullable(),
  model: z.string().trim().optional().nullable(),
  fuel_type: z.string().trim().min(1).default("diesel"),
  tank_capacity_gallons: z.coerce.number().positive().default(200),
  target_mpg: z.coerce.number().positive().default(6.5),
  week_start_min_gallons: z.coerce.number().nonnegative().default(100),
  reserve_gallons: z.coerce.number().nonnegative().default(25),
  notes: z.string().trim().optional().nullable(),
  status: z.enum(["active", "maintenance", "inactive"]).default("active"),
});

const driverRowSchema = z.object({
  full_name: z.string().trim().min(1),
  email: z.email(),
  phone: z.string().trim().optional().nullable(),
  unit_number: z.string().trim().optional().nullable(),
});

const assignmentRowSchema = z.object({
  email: z.email(),
  unit_number: z.string().trim().min(1),
  starts_at: z.string().trim().optional().nullable(),
});

export type FleetPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  normalized: Record<string, unknown> | null;
  error: string | null;
  duplicateOf?: string;
};

export function applyMapping(
  table: string[][],
  mapping: Record<string, string>,
): Array<{ rowNumber: number; values: Record<string, string> }> {
  if (table.length === 0) return [];
  const headers = table[0];
  return table.slice(1).map((cells, index) => {
    const values: Record<string, string> = {};
    for (const [field, source] of Object.entries(mapping)) {
      const column = headers.findIndex((header) => header.trim() === source.trim());
      values[field] = column >= 0 ? (cells[column] ?? "").trim() : "";
    }
    return { rowNumber: index + 2, values };
  });
}

function schemaForKind(kind: FleetImportKind) {
  if (kind === "trucks") return truckRowSchema;
  if (kind === "drivers") return driverRowSchema;
  return assignmentRowSchema;
}

export function previewFleetCsv(input: {
  text: string;
  kind: FleetImportKind;
  mapping?: Record<string, string>;
}): {
  headers: string[];
  mapping: Record<string, string>;
  rows: FleetPreviewRow[];
} {
  const table = parseCsv(input.text);
  const headers = table[0] ?? [];
  const mapping = input.mapping && Object.keys(input.mapping).length ? input.mapping : autoMapHeaders(headers, headersForKind(input.kind));
  const schema = schemaForKind(input.kind);
  const seen = new Map<string, number>();
  const rows = applyMapping(table, mapping).map((row) => {
    const parsed = schema.safeParse(row.values);
    const key =
      input.kind === "trucks"
        ? row.values.unit_number?.toLowerCase()
        : row.values.email?.toLowerCase();
    let duplicateOf: string | undefined;
    if (key) {
      const first = seen.get(key);
      if (first) duplicateOf = `row ${first}`;
      else seen.set(key, row.rowNumber);
    }
    if (!parsed.success) {
      return {
        rowNumber: row.rowNumber,
        values: row.values,
        normalized: null,
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
        duplicateOf,
      };
    }
    return {
      rowNumber: row.rowNumber,
      values: row.values,
      normalized: parsed.data as Record<string, unknown>,
      error: null,
      duplicateOf,
    };
  });
  return { headers, mapping, rows };
}

export function fleetTemplateCsv(kind: FleetImportKind) {
  const headers = headersForKind(kind);
  if (kind === "trucks") {
    return `${headers.join(",")}\n101,1HGBH41JXMN109186,ABC1234,TX,2019,Freightliner,Cascadia,diesel,200,6.5,100,25,Day cab,active\n`;
  }
  if (kind === "drivers") {
    return `${headers.join(",")}\nAlex Driver,driver.a@example.com,555-0100,101\n`;
  }
  return `${headers.join(",")}\ndriver.a@example.com,101,2026-01-01T00:00:00Z\n`;
}
