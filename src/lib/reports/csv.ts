import { z } from "zod";
import { regionSchema } from "@/lib/validation/receipt";

export const fuelPriceCsvRowSchema = z.object({
  station_name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: regionSchema,
  zip: z.string().trim().optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  price: z.coerce.number().positive(),
  fuel_type: z.string().trim().min(1).default("diesel"),
  observed_at: z.string().min(1),
  truck_access: z.enum(["yes", "no", "unknown"]).default("unknown"),
  parking_available: z.enum(["yes", "no", "unknown"]).default("unknown"),
  trailer_policy: z.enum(["stay_attached", "drop_required", "unknown"]).default("unknown"),
  drop_location: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type FuelPriceCsvRow = z.infer<typeof fuelPriceCsvRowSchema>;

export const FUEL_PRICE_CSV_HEADERS = [
  "station_name",
  "address",
  "city",
  "state",
  "zip",
  "latitude",
  "longitude",
  "price",
  "fuel_type",
  "observed_at",
  "truck_access",
  "parking_available",
  "trailer_policy",
  "drop_location",
  "notes",
] as const;

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  return rows;
}

export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\n\r]/.test(text) || text.startsWith("'")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function validateFuelPriceCsv(text: string): {
  valid: Array<FuelPriceCsvRow & { rowNumber: number }>;
  errors: Array<{ rowNumber: number; message: string }>;
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { valid: [], errors: [{ rowNumber: 0, message: "CSV is empty." }] };
  }
  const headers = table[0].map((header) => header.trim().toLowerCase());
  const missing = FUEL_PRICE_CSV_HEADERS.filter(
    (header) =>
      !["zip", "latitude", "longitude", "drop_location", "notes"].includes(header) &&
      !headers.includes(header),
  );
  if (missing.length) {
    return {
      valid: [],
      errors: [{ rowNumber: 1, message: `Missing columns: ${missing.join(", ")}` }],
    };
  }
  const valid: Array<FuelPriceCsvRow & { rowNumber: number }> = [];
  const errors: Array<{ rowNumber: number; message: string }> = [];
  table.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2;
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = cells[i] ?? "";
    });
    const parsed = fuelPriceCsvRowSchema.safeParse(record);
    if (!parsed.success) {
      errors.push({
        rowNumber,
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      });
      return;
    }
    valid.push({ ...parsed.data, rowNumber });
  });
  return { valid, errors };
}
