import { z } from "zod";
import { roundTo } from "@/lib/calculations/math";

export const US_CA_REGIONS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
] as const;

export const regionSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => US_CA_REGIONS.includes(value as (typeof US_CA_REGIONS)[number]), {
    message: "Enter a two-letter US state or Canadian province code.",
  });

export const receiptReviewSchema = z.object({
  truckId: z.string().uuid(),
  purchasedAt: z.string().min(1),
  merchantName: z.string().trim().min(1, "Merchant is required"),
  merchantAddress: z.string().trim().min(1, "Address is required"),
  merchantCity: z.string().trim().min(1, "City is required"),
  merchantRegion: regionSchema,
  merchantPostalCode: z.string().trim().optional().nullable(),
  receiptNumber: z.string().trim().optional().nullable(),
  purchaserName: z.string().trim().min(1, "Purchaser name is required"),
  fuelType: z.string().trim().min(1).default("diesel"),
  gallons: z.coerce.number().positive("Gallons must be greater than zero"),
  pricePerGallon: z.coerce.number().positive().nullable().optional(),
  subtotalAmount: z.coerce.number().nonnegative().nullable().optional(),
  taxAmount: z.coerce.number().nonnegative().nullable().optional(),
  totalAmount: z.coerce.number().positive("Total must be greater than zero"),
  odometer: z.coerce.number().nonnegative().nullable().optional(),
  paymentLast4: z
    .string()
    .regex(/^\d{4}$/, "Use the last four digits only")
    .optional()
    .nullable(),
  tankLevelAfterMode: z.enum(["unknown", "full", "percent", "gallons"]),
  tankLevelAfterValue: z.coerce.number().nullable().optional(),
  trailerAttached: z.boolean().nullable().optional(),
  driverNote: z.string().trim().max(2000).optional().nullable(),
});

export type ReceiptReviewInput = z.infer<typeof receiptReviewSchema>;

export type ReceiptWarning = {
  code: string;
  message: string;
  severity: "warning" | "error";
};

export function derivePricePerGallon(input: {
  gallons: number;
  totalAmount: number;
  pricePerGallon?: number | null;
}): { pricePerGallon: number; derived: boolean } {
  if (input.pricePerGallon && input.pricePerGallon > 0) {
    return { pricePerGallon: roundTo(input.pricePerGallon, 4), derived: false };
  }
  return {
    pricePerGallon: roundTo(input.totalAmount / input.gallons, 4),
    derived: true,
  };
}

export function validateReceiptMath(
  input: ReceiptReviewInput & { tankCapacityGallons: number; previousOdometer?: number | null },
  options?: { tolerance?: number; now?: Date },
): ReceiptWarning[] {
  const warnings: ReceiptWarning[] = [];
  const now = options?.now ?? new Date();
  const tolerance = options?.tolerance ?? 0.08;
  const purchasedAt = new Date(input.purchasedAt);

  if (Number.isNaN(purchasedAt.getTime())) {
    warnings.push({ code: "invalid_date", message: "Purchase date/time is invalid.", severity: "error" });
  } else {
    if (purchasedAt.getTime() > now.getTime() + 5 * 60 * 1000) {
      warnings.push({ code: "future_date", message: "Purchase date is in the future.", severity: "warning" });
    }
    const hoursAfterPurchase = (now.getTime() - purchasedAt.getTime()) / (1000 * 60 * 60);
    if (hoursAfterPurchase > 24) {
      warnings.push({
        code: "late_submission",
        message: "This receipt is being submitted more than 24 hours after purchase.",
        severity: "warning",
      });
    }
  }

  if (input.gallons <= 0 || input.totalAmount <= 0) {
    warnings.push({
      code: "non_positive",
      message: "Gallons and total must be greater than zero.",
      severity: "error",
    });
  }

  const { pricePerGallon } = derivePricePerGallon(input);
  if (pricePerGallon < 1.5 || pricePerGallon > 9) {
    warnings.push({
      code: "implausible_price",
      message: `Price per gallon ($${pricePerGallon.toFixed(3)}) looks implausible for diesel.`,
      severity: "warning",
    });
  }

  if (input.pricePerGallon && input.gallons) {
    const expected = input.gallons * input.pricePerGallon;
    const delta = Math.abs(expected - input.totalAmount) / input.totalAmount;
    if (delta > tolerance) {
      warnings.push({
        code: "math_mismatch",
        message:
          "Gallons × price does not match the total. Tax, DEF, or other items may explain this — confirm before submitting.",
        severity: "warning",
      });
    }
  }

  if (input.gallons > input.tankCapacityGallons) {
    warnings.push({
      code: "over_capacity",
      message:
        "Purchased gallons exceed this truck's tank capacity. Split tanks, reefer fuel, or an OCR error may explain it. A manager override is required.",
      severity: "warning",
    });
  }

  if (
    input.odometer !== null &&
    input.odometer !== undefined &&
    input.previousOdometer !== null &&
    input.previousOdometer !== undefined &&
    input.odometer < input.previousOdometer
  ) {
    warnings.push({
      code: "odometer_rollback",
      message: "Odometer is lower than the previous receipt for this truck.",
      severity: "warning",
    });
  }

  if (input.tankLevelAfterMode === "percent") {
    const value = input.tankLevelAfterValue;
    if (value === null || value === undefined || value < 0 || value > 100) {
      warnings.push({
        code: "invalid_percent",
        message: "Tank percent must be between 0 and 100.",
        severity: "error",
      });
    }
  }

  if (input.tankLevelAfterMode === "gallons") {
    const value = input.tankLevelAfterValue;
    if (value === null || value === undefined || value < 0) {
      warnings.push({
        code: "invalid_gallons_remaining",
        message: "Gallons remaining must be zero or greater.",
        severity: "error",
      });
    }
  }

  return warnings;
}
