export type ExtractedField<T> = {
  value: T | null;
  confidence: number | null;
  source: "ocr" | "inferred" | "manual";
};

export type NormalizedReceiptExtraction = {
  merchantName: ExtractedField<string>;
  merchantAddress: ExtractedField<string>;
  merchantCity: ExtractedField<string>;
  merchantRegion: ExtractedField<string>;
  merchantPostalCode: ExtractedField<string>;
  purchasedAt: ExtractedField<string>;
  receiptNumber: ExtractedField<string>;
  gallons: ExtractedField<number>;
  pricePerGallon: ExtractedField<number>;
  subtotalAmount: ExtractedField<number>;
  taxAmount: ExtractedField<number>;
  totalAmount: ExtractedField<number>;
  fuelType: ExtractedField<string>;
  purchaserName: ExtractedField<string>;
  rawText: string | null;
  overallConfidence: number | null;
  provider: string;
  providerDocumentId: string | null;
  providerRaw?: unknown;
  warnings: string[];
};

export type ReceiptOcrInput = {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
};

export interface ReceiptOcrProvider {
  analyze(input: ReceiptOcrInput): Promise<NormalizedReceiptExtraction>;
}

export function emptyExtraction(
  provider: string,
  warnings: string[],
): NormalizedReceiptExtraction {
  const emptyString = (): ExtractedField<string> => ({
    value: null,
    confidence: null,
    source: "ocr",
  });
  const emptyNumber = (): ExtractedField<number> => ({
    value: null,
    confidence: null,
    source: "ocr",
  });
  return {
    merchantName: emptyString(),
    merchantAddress: emptyString(),
    merchantCity: emptyString(),
    merchantRegion: emptyString(),
    merchantPostalCode: emptyString(),
    purchasedAt: emptyString(),
    receiptNumber: emptyString(),
    gallons: emptyNumber(),
    pricePerGallon: emptyNumber(),
    subtotalAmount: emptyNumber(),
    taxAmount: emptyNumber(),
    totalAmount: emptyNumber(),
    fuelType: emptyString(),
    purchaserName: emptyString(),
    rawText: null,
    overallConfidence: null,
    provider,
    providerDocumentId: null,
    warnings,
  };
}

export function field<T>(
  value: T | null | undefined,
  confidence: number | null | undefined,
): ExtractedField<T> {
  return {
    value: value ?? null,
    confidence: confidence ?? null,
    source: "ocr",
  };
}
