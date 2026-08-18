import { getServerEnv } from "@/lib/env";
import { ManualReceiptOcrProvider } from "./manual";
import { MindeeReceiptOcrProvider } from "./mindee";
import { GeminiReceiptOcrProvider, OpenAiReceiptOcrProvider } from "./vision";
import type { ReceiptOcrProvider } from "./types";

export function hasCloudOcr() {
  const env = getServerEnv();
  return Boolean(env.MINDEE_API_KEY || env.GEMINI_API_KEY || env.OPENAI_API_KEY);
}

export function getReceiptOcrProvider(): ReceiptOcrProvider {
  const env = getServerEnv();
  if (env.RECEIPT_OCR_PROVIDER === "mindee" && env.MINDEE_API_KEY) {
    return new MindeeReceiptOcrProvider(env.MINDEE_API_KEY);
  }
  if (env.RECEIPT_OCR_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
    return new GeminiReceiptOcrProvider(env.GEMINI_API_KEY);
  }
  if (env.RECEIPT_OCR_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    return new OpenAiReceiptOcrProvider(env.OPENAI_API_KEY);
  }
  if (env.MINDEE_API_KEY && env.RECEIPT_OCR_PROVIDER !== "manual") {
    return new MindeeReceiptOcrProvider(env.MINDEE_API_KEY);
  }
  if (env.GEMINI_API_KEY) {
    return new GeminiReceiptOcrProvider(env.GEMINI_API_KEY);
  }
  if (env.OPENAI_API_KEY) {
    return new OpenAiReceiptOcrProvider(env.OPENAI_API_KEY);
  }
  return new ManualReceiptOcrProvider();
}

export type { ReceiptOcrProvider, ReceiptOcrInput, NormalizedReceiptExtraction } from "./types";
