import { sha256Hex } from "@/lib/calculations";
import { deleteQueuedReceipt, updateQueuedReceipt, type QueuedReceipt } from "@/lib/offline/queue";

export async function flushQueuedReceipt(item: QueuedReceipt): Promise<string | null> {
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
  await fetch(`/api/receipts/${data.receiptId}/ocr`, { method: "POST" });
  await deleteQueuedReceipt(item.id);
  return data.receiptId;
}
