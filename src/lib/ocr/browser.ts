import type { NormalizedReceiptExtraction } from "./types";

type TesseractModule = {
  createWorker: typeof import("tesseract.js").createWorker;
  default?: { createWorker: typeof import("tesseract.js").createWorker };
};

export async function recognizeReceiptText(image: Blob | File | string): Promise<string> {
  const tess = (await import("tesseract.js")) as TesseractModule;
  const createWorker = tess.createWorker ?? tess.default?.createWorker;
  if (!createWorker) {
    throw new Error("OCR engine is unavailable in this browser.");
  }
  const worker = await createWorker("eng", undefined, {
    errorHandler: () => undefined,
  });
  try {
    const result = await worker.recognize(image);
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

export function extractionFromUnknown(value: unknown): NormalizedReceiptExtraction | null {
  if (!value || typeof value !== "object") return null;
  return value as NormalizedReceiptExtraction;
}
