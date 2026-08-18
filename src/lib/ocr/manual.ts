import { emptyExtraction, type NormalizedReceiptExtraction, type ReceiptOcrProvider } from "./types";

export class ManualReceiptOcrProvider implements ReceiptOcrProvider {
  async analyze(): Promise<NormalizedReceiptExtraction> {
    return emptyExtraction("manual", [
      "OCR is in manual-entry mode. Confirm every field from the receipt photo before submitting.",
    ]);
  }
}
