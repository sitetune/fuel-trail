import { z } from "zod";
import { enrichExtraction, mergeExtractions, parseFuelReceiptText } from "./parse-text";
import { emptyExtraction, field, type NormalizedReceiptExtraction, type ReceiptOcrProvider } from "./types";

const mindeeField = z
  .object({
    value: z.union([z.string(), z.number()]).nullable().optional(),
    confidence: z.number().nullable().optional(),
  })
  .passthrough();

const mindeeLineItem = z
  .object({
    description: z.string().nullable().optional(),
    quantity: z.number().nullable().optional(),
    unit_price: z.number().nullable().optional(),
    total_amount: z.number().nullable().optional(),
  })
  .passthrough();

const mindeePrediction = z
  .object({
    supplier_name: mindeeField.optional(),
    supplier_address: mindeeField.optional(),
    date: mindeeField.optional(),
    time: mindeeField.optional(),
    receipt_number: mindeeField.optional(),
    total_amount: mindeeField.optional(),
    total_net: mindeeField.optional(),
    total_tax: mindeeField.optional(),
    category: mindeeField.optional(),
    locale: z
      .object({
        country: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        language: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    line_items: z.array(mindeeLineItem).optional(),
  })
  .passthrough();

const mindeeResponseSchema = z
  .object({
    document: z
      .object({
        id: z.string().optional(),
        inference: z
          .object({
            prediction: mindeePrediction,
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

const GALLON_PATTERN = /(\d+(?:\.\d+)?)\s*(gal|gallon|gallons|gals)\b/i;

function parseAddress(address: string | null): {
  address: string | null;
  city: string | null;
  region: string | null;
  postal: string | null;
} {
  if (!address) return { address: null, city: null, region: null, postal: null };
  const regionMatch = address.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/);
  const cityMatch = address.match(/,\s*([^,]+),\s*[A-Z]{2}\b/);
  return {
    address,
    city: cityMatch?.[1]?.trim() ?? null,
    region: regionMatch?.[1] ?? null,
    postal: regionMatch?.[2] ?? null,
  };
}

export function gallonsFromLineItems(
  lineItems: { description?: string | null; quantity?: number | null; unit_price?: number | null }[],
  rawText?: string | null,
): { gallons: number | null; confidence: number | null; pricePerGallon: number | null } {
  for (const item of lineItems) {
    const description = item.description ?? "";
    const unitPrice =
      item.unit_price && item.unit_price >= 1 && item.unit_price <= 20 ? item.unit_price : null;
    if (/diesel|fuel|gal|gasoline|def/i.test(description) && item.quantity && item.quantity > 5) {
      return { gallons: item.quantity, confidence: 0.55, pricePerGallon: unitPrice };
    }
    const match = description.match(GALLON_PATTERN);
    if (match) return { gallons: Number(match[1]), confidence: 0.6, pricePerGallon: unitPrice };
  }
  if (rawText) {
    const match = rawText.match(GALLON_PATTERN);
    if (match) return { gallons: Number(match[1]), confidence: 0.45, pricePerGallon: null };
  }
  return { gallons: null, confidence: null, pricePerGallon: null };
}

export function normalizeMindeePrediction(
  raw: unknown,
  fallbackWarning?: string,
): NormalizedReceiptExtraction {
  const parsed = mindeeResponseSchema.safeParse(raw);
  if (!parsed.success) {
    const empty = emptyExtraction("mindee", [
      fallbackWarning ?? "Mindee returned a payload that did not match the expected receipt schema. Enter fields manually.",
    ]);
    return empty;
  }
  const prediction = parsed.data.document.inference.prediction;
  const supplierAddress =
    typeof prediction.supplier_address?.value === "string"
      ? prediction.supplier_address.value
      : null;
  const parsedAddress = parseAddress(supplierAddress);
  const lineItems = prediction.line_items ?? [];
  const gallons = gallonsFromLineItems(lineItems, mindeeRawText(raw));
  const dateValue = prediction.date?.value ? String(prediction.date.value) : null;
  const timeValue = prediction.time?.value ? String(prediction.time.value) : null;
  const purchasedAt = dateValue ? `${dateValue}${timeValue ? `T${timeValue}` : "T12:00:00"}` : null;
  const category = prediction.category?.value ? String(prediction.category.value) : null;
  const warnings: string[] = [];
  if (!gallons.gallons) {
    warnings.push("Gallons were not extracted. Confirm gallons from the receipt photo.");
  }
  if (!parsedAddress.region) {
    warnings.push("Purchase jurisdiction (state/province) was not extracted.");
  }

  const confidences = [
    prediction.supplier_name?.confidence,
    prediction.date?.confidence,
    prediction.total_amount?.confidence,
  ].filter((value): value is number => typeof value === "number");
  const overall =
    confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : null;

  const extracted: NormalizedReceiptExtraction = {
    merchantName: field(
      prediction.supplier_name?.value ? String(prediction.supplier_name.value) : null,
      prediction.supplier_name?.confidence ?? null,
    ),
    merchantAddress: field(parsedAddress.address, prediction.supplier_address?.confidence ?? null),
    merchantCity: field(parsedAddress.city, prediction.supplier_address?.confidence ?? null),
    merchantRegion: field(parsedAddress.region, prediction.supplier_address?.confidence ?? null),
    merchantPostalCode: field(parsedAddress.postal, prediction.supplier_address?.confidence ?? null),
    purchasedAt: field(purchasedAt, prediction.date?.confidence ?? null),
    receiptNumber: field(
      prediction.receipt_number?.value ? String(prediction.receipt_number.value) : null,
      prediction.receipt_number?.confidence ?? null,
    ),
    gallons: field<number>(gallons.gallons, gallons.confidence),
    pricePerGallon: field<number>(gallons.pricePerGallon, gallons.pricePerGallon ? 0.55 : null),
    subtotalAmount: field(
      typeof prediction.total_net?.value === "number" ? prediction.total_net.value : null,
      prediction.total_net?.confidence ?? null,
    ),
    taxAmount: field(
      typeof prediction.total_tax?.value === "number" ? prediction.total_tax.value : null,
      prediction.total_tax?.confidence ?? null,
    ),
    totalAmount: field(
      typeof prediction.total_amount?.value === "number" ? prediction.total_amount.value : null,
      prediction.total_amount?.confidence ?? null,
    ),
    fuelType: field<string>(category === "gasoline" ? "diesel" : "diesel", category ? 0.4 : null),
    purchaserName: field<string>(null, null),
    rawText: mindeeRawText(raw),
    overallConfidence: overall,
    provider: "mindee",
    providerDocumentId: parsed.data.document.id ?? null,
    warnings,
  };
  const ocrText = extracted.rawText;
  if (ocrText) {
    return enrichExtraction(mergeExtractions(extracted, parseFuelReceiptText(ocrText)));
  }
  return enrichExtraction(extracted);
}

function mindeeRawText(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const document = (raw as { document?: Record<string, unknown> }).document;
  if (!document) return null;
  const ocr = document.ocr as { text?: string } | undefined;
  if (typeof ocr?.text === "string" && ocr.text.trim()) return ocr.text;
  return null;
}

export class MindeeReceiptOcrProvider implements ReceiptOcrProvider {
  constructor(private readonly apiKey: string) {}

  async analyze(input: { bytes: Uint8Array; mimeType: string; fileName: string }) {
    const form = new FormData();
    const blob = new Blob([input.bytes as BlobPart], { type: input.mimeType });
    form.append("document", blob, input.fileName);

    const response = await fetch(
      "https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict",
      {
        method: "POST",
        headers: { Authorization: `Token ${this.apiKey}` },
        body: form,
      },
    );

    if (!response.ok) {
      return emptyExtraction("mindee", [
        "Mindee could not read this receipt. Enter the fields from the photo. The original image is saved.",
      ]);
    }

    const json: unknown = await response.json();
    return normalizeMindeePrediction(json);
  }
}
