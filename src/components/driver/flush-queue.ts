import { sha256Hex } from "@/lib/calculations";
import { deleteQueuedReceipt, updateQueuedReceipt, type QueuedReceipt } from "@/lib/offline/queue";
import { recognizeReceiptText } from "@/lib/ocr/browser";
import { extractionNeedsSecondPass } from "@/lib/ocr/parse-text";
import type { NormalizedReceiptExtraction } from "@/lib/ocr/types";

async function postOcr(receiptId: string, rawText?: string) {
  const response = await fetch(`/api/receipts/${receiptId}/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText: rawText || undefined }),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { data?: { extracted?: NormalizedReceiptExtraction } };
  return json.data?.extracted ?? null;
}

export async function flushQueuedReceipt(
  item: QueuedReceipt,
  options?: { onStatus?: (message: string) => void },
): Promise<string | null> {
  await updateQueuedReceipt(item.id, { status: "uploading" });
  const initiate = await fetch("/api/receipts/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientReceiptUuid: item.id,
      fileName: item.fileName,
      contentType: item.mimeType,
    }),
  });
  if (!initiate.ok) {
    await updateQueuedReceipt(item.id, { status: "failed", lastError: "Could not start upload." });
    return null;
  }
  const { data } = (await initiate.json()) as {
    data: { receiptId: string; signedUrl: string; token: string; reused: boolean };
  };
  if (!data.reused) {
    const upload = await fetch(data.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": item.mimeType, "x-upsert": "false" },
      body: item.blob,
    });
    if (!upload.ok) {
      await updateQueuedReceipt(item.id, { status: "failed", lastError: "Storage upload failed." });
      return null;
    }
  }
  const bytes = await item.blob.arrayBuffer();
  const sha = item.sha256 || (await sha256Hex(bytes));
  await fetch(`/api/receipts/${data.receiptId}/upload-complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha256: sha }),
  });
  options?.onStatus?.("Reading the receipt…");
  let extracted = await postOcr(data.receiptId);
  if (extractionNeedsSecondPass(extracted)) {
    options?.onStatus?.("Trying a second pass on this photo…");
    try {
      const rawText = await recognizeReceiptText(item.blob);
      extracted = await postOcr(data.receiptId, rawText);
    } catch {
      extracted = extracted ?? null;
    }
  }
  await deleteQueuedReceipt(item.id);
  return data.receiptId;
}
