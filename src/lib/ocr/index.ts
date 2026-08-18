import { getServerEnv } from "@/lib/env";
import { ManualReceiptOcrProvider } from "./manual";
import { MindeeReceiptOcrProvider } from "./mindee";
import type { ReceiptOcrProvider } from "./types";

export function getReceiptOcrProvider(): ReceiptOcrProvider {
  const env = getServerEnv();
  if (env.RECEIPT_OCR_PROVIDER === "mindee") {
    if (!env.MINDEE_API_KEY) {
      return new ManualReceiptOcrProvider();
    }
    return new MindeeReceiptOcrProvider(env.MINDEE_API_KEY);
  }
  return new ManualReceiptOcrProvider();
}

export type { ReceiptOcrProvider, ReceiptOcrInput, NormalizedReceiptExtraction } from "./types";
