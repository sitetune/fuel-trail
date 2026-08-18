import { roundTo } from "@/lib/calculations/math";
import {
  emptyExtraction,
  field,
  type ExtractedField,
  type NormalizedReceiptExtraction,
} from "./types";

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
]);

const SKIP_MERCHANT = /^(welcome|thank you|thanks|customer copy|merchant copy|store copy|visa|mastercard|debit|credit|diesel|ulsd|fuel|total|subtotal|tax|cash|change|qty|pump|lane|invoice|receipt)\b/i;

export function extractionHasValues(extraction: NormalizedReceiptExtraction | null | undefined) {
  if (!extraction) return false;
  return Boolean(
    extraction.merchantName.value ||
      extraction.merchantAddress.value ||
      extraction.gallons.value ||
      extraction.totalAmount.value ||
      extraction.purchasedAt.value ||
      extraction.receiptNumber.value,
  );
}

export function pickField<T>(
  primary: ExtractedField<T>,
  fallback: ExtractedField<T>,
): ExtractedField<T> {
  return primary.value != null ? primary : fallback;
}

export function mergeExtractions(
  primary: NormalizedReceiptExtraction,
  fallback: NormalizedReceiptExtraction,
): NormalizedReceiptExtraction {
  const merged: NormalizedReceiptExtraction = {
    merchantName: pickField(primary.merchantName, fallback.merchantName),
    merchantAddress: pickField(primary.merchantAddress, fallback.merchantAddress),
    merchantCity: pickField(primary.merchantCity, fallback.merchantCity),
    merchantRegion: pickField(primary.merchantRegion, fallback.merchantRegion),
    merchantPostalCode: pickField(primary.merchantPostalCode, fallback.merchantPostalCode),
    purchasedAt: pickField(primary.purchasedAt, fallback.purchasedAt),
    receiptNumber: pickField(primary.receiptNumber, fallback.receiptNumber),
    gallons: pickField(primary.gallons, fallback.gallons),
    pricePerGallon: pickField(primary.pricePerGallon, fallback.pricePerGallon),
    subtotalAmount: pickField(primary.subtotalAmount, fallback.subtotalAmount),
    taxAmount: pickField(primary.taxAmount, fallback.taxAmount),
    totalAmount: pickField(primary.totalAmount, fallback.totalAmount),
    fuelType: pickField(primary.fuelType, fallback.fuelType),
    purchaserName: pickField(primary.purchaserName, fallback.purchaserName),
    rawText: primary.rawText ?? fallback.rawText,
    overallConfidence: primary.overallConfidence ?? fallback.overallConfidence,
    provider: extractionHasValues(primary) ? primary.provider : fallback.provider,
    providerDocumentId: primary.providerDocumentId ?? fallback.providerDocumentId,
    warnings: [...primary.warnings, ...fallback.warnings.filter((warning) => !primary.warnings.includes(warning))],
  };
  return enrichExtraction(merged);
}

export function enrichExtraction(extraction: NormalizedReceiptExtraction): NormalizedReceiptExtraction {
  const next = { ...extraction };
  if (
    next.pricePerGallon.value == null &&
    next.gallons.value &&
    next.gallons.value > 0 &&
    next.totalAmount.value != null
  ) {
    next.pricePerGallon = {
      value: roundTo(next.totalAmount.value / next.gallons.value, 4),
      confidence: Math.min(next.gallons.confidence ?? 0.5, next.totalAmount.confidence ?? 0.5) * 0.9,
      source: "inferred",
    };
  }
  if (!next.gallons.value) {
    next.warnings = uniqueWarnings(next.warnings, "Gallons were not extracted. Confirm gallons from the receipt photo.");
  }
  if (!next.merchantRegion.value) {
    next.warnings = uniqueWarnings(next.warnings, "Purchase jurisdiction (state/province) was not extracted.");
  }
  const confidences = [
    next.merchantName.confidence,
    next.purchasedAt.confidence,
    next.totalAmount.confidence,
    next.gallons.confidence,
  ].filter((value): value is number => typeof value === "number");
  next.overallConfidence =
    confidences.length > 0
      ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
      : next.overallConfidence;
  return next;
}

export function parseFuelReceiptText(rawText: string): NormalizedReceiptExtraction {
  const text = rawText.replace(/\r/g, "").replace(/\u00a0/g, " ").trim();
  if (!text) {
    return emptyExtraction("tesseract", [
      "No text could be read from the photo. Enter the fields from the receipt image.",
    ]);
  }

  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const merchantName = brandFromText(text) ?? merchantFromLines(lines);
  const address = addressFromText(text, lines);
  const purchasedAt = dateTimeFromText(text);
  const receiptNumber = receiptNumberFromText(text);
  const gallons = gallonsFromText(text);
  const pricePerGallon = pricePerGallonFromText(text);
  const totalAmount = totalFromText(text);
  const fuelType = /unleaded|gasoline|gas\b/i.test(text) && !/diesel|ulsd|dsl/i.test(text) ? "diesel" : "diesel";

  const extraction = emptyExtraction("tesseract", []);
  extraction.rawText = text;
  extraction.merchantName = field(merchantName, merchantName ? 0.62 : null);
  extraction.merchantAddress = field(address.address, address.address ? 0.58 : null);
  extraction.merchantCity = field(address.city, address.city ? 0.6 : null);
  extraction.merchantRegion = field(address.region, address.region ? 0.7 : null);
  extraction.merchantPostalCode = field(address.postal, address.postal ? 0.7 : null);
  extraction.purchasedAt = field(purchasedAt, purchasedAt ? 0.64 : null);
  extraction.receiptNumber = field(receiptNumber, receiptNumber ? 0.55 : null);
  extraction.gallons = field(gallons, gallons ? 0.66 : null);
  extraction.pricePerGallon = field(pricePerGallon, pricePerGallon ? 0.6 : null);
  extraction.totalAmount = field(totalAmount, totalAmount ? 0.68 : null);
  extraction.fuelType = field(fuelType, 0.4);
  extraction.warnings = [
    "OCR filled these fields from the photo. Confirm every value before submitting.",
  ];
  return enrichExtraction(extraction);
}

function uniqueWarnings(warnings: string[], warning: string) {
  return warnings.includes(warning) ? warnings : [...warnings, warning];
}

function brandFromText(text: string) {
  const brands: Array<[RegExp, string]> = [
    [/flying\s*j/i, "Flying J"],
    [/pilot/i, "Pilot"],
    [/love'?s/i, "Love's"],
    [/\bpetro\b/i, "Petro"],
    [/\bta\s+travel/i, "TA"],
    [/travelcenters?\s+of\s+america/i, "TA"],
    [/kwik\s*trip/i, "Kwik Trip"],
    [/casey's/i, "Casey's"],
    [/speedway/i, "Speedway"],
    [/racetrac/i, "RaceTrac"],
    [/quake[rn]\s*state/i, "Quaker State"],
  ];
  for (const [pattern, name] of brands) {
    if (pattern.test(text)) return name;
  }
  return null;
}

function looksLikeMerchant(line: string) {
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  if (/\$|gallons?|trdsl|reefer|pump|subtotal|tendered/i.test(line)) return false;
  const vowels = (letters.match(/[aeiou]/gi) ?? []).length;
  if (vowels === 0) return false;
  if ((line.match(/[^A-Za-z0-9\s'#.-]/g) ?? []).length > 3) return false;
  return true;
}

function merchantFromLines(lines: string[]) {
  for (const line of lines.slice(0, 8)) {
    if (line.length < 3 || line.length > 48) continue;
    if (SKIP_MERCHANT.test(line)) continue;
    if (/^\d/.test(line)) continue;
    if (/\d{5}(?:-\d{4})?$/.test(line)) continue;
    if (/[A-Z]{2}\s+\d{5}/.test(line)) continue;
    if (/^[\d$.:/-]+$/.test(line)) continue;
    if (!looksLikeMerchant(line)) continue;
    return line.replace(/^\W+|\W+$/g, "").trim() || line;
  }
  return null;
}

function addressFromText(text: string, lines: string[]) {
  const cityStateZip =
    text.match(/\b([A-Za-z][A-Za-z .'-]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/) ??
    text.match(/\b([A-Za-z][A-Za-z .'-]+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/);
  const region = cityStateZip?.[2] && US_STATES.has(cityStateZip[2]) ? cityStateZip[2] : null;
  let city = cityStateZip?.[1]?.replace(/,$/, "").trim() ?? null;
  if (city) city = city.replace(/^(?:[a-z]{1,2}\s+)+/i, "").replace(/^[^A-Za-z]+/, "");
  const postal = cityStateZip?.[3] ?? null;

  const streetLine = lines.find((line) => {
    if (/\$|gallons?|trdsl|reefer|pump|total|subtotal/i.test(line)) return false;
    return (
      /^\d{1,6}\s+.+$/.test(line) &&
      /\b(st|street|ave|avenue|rd|road|hwy|highway|blvd|dr|drive|ln|lane|pkwy|cir|way)\b|\bi-\d+\b|\bus[- ]?\d+\b|\bfm\s?\d+\b/i.test(
        line,
      )
    );
  });
  return {
    address: streetLine ?? null,
    city,
    region,
    postal,
  };
}

function dateTimeFromText(text: string) {
  const dateMatch =
    text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/) ??
    text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!dateMatch) return null;
  let year: number;
  let month: number;
  let day: number;
  if (dateMatch[1].length === 4) {
    year = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    day = Number(dateMatch[3]);
  } else {
    month = Number(dateMatch[1]);
    day = Number(dateMatch[2]);
    year = Number(dateMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\b/i);
  let hour = 12;
  let minute = 0;
  let second = 0;
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    second = Number(timeMatch[3] ?? 0);
    const meridiem = timeMatch[4]?.toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function receiptNumberFromText(text: string) {
  const labeled =
    text.match(/\breceipt\s*#?:?\s*([A-Z0-9-]{4,})\b/i) ??
    text.match(/\btransaction\s*#?:?\s*([A-Z0-9-]{4,})\b/i);
  if (labeled?.[1] && !/fed|ein|id/i.test(labeled[0])) return labeled[1];
  return null;
}

function gallonsFromText(text: string) {
  const labeled = [...text.matchAll(/\bgallons?\s*:\s*(\d{1,3}(?:\.\d{1,4})?)/gi)];
  const inline = [...text.matchAll(/(\d{1,3}(?:\.\d{1,4})?)[^\S\n]*(?:GALS?|GALLONS?)\b/gi)];
  const values = [...labeled, ...inline]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0.5 && value <= 400);
  if (values.length === 0) return null;
  const unique = [...new Set(values.map((value) => Number(value.toFixed(4))))];
  return unique.length > 1 ? unique.reduce((sum, value) => sum + value, 0) : unique[0];
}

function pricePerGallonFromText(text: string) {
  const match =
    text.match(/price\s*\/\s*gal(?:lon)?s?\s*:?\s*\$?\s*(\d\.\d{3,4})/i) ??
    text.match(/(?:PPG|PER\s*GAL(?:LON)?|PUMP\s*PRICE)\s*[:$]?\s*(\d\.\d{3,4})/i) ??
    text.match(/\$\s*(\d\.\d{3,4})\s*(?:\/\s*GAL|PER\s*GAL)/i) ??
    text.match(/(\d\.\d{3,4})\s*\/\s*GAL/i) ??
    text.match(/@\s*\$?\s*(\d\.\d{3,4})/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 20 ? value : null;
}

function totalFromText(text: string) {
  const matches = [
    ...text.matchAll(/(?:TOTAL(?:\s+(?:SALE|FUEL|AMOUNT))?|AMOUNT\s+(?:DUE|TENDERED)|SALE\s+AMT)\s*[:$]?\s*\$?\s*(\d{1,4}[.,]\d{2})/gi),
  ];
  const values = matches
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 1 && value < 5000);
  if (values.length > 0) return values[values.length - 1];
  return null;
}
