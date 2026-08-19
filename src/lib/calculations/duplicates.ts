function normalizeMerchant(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type DuplicateSignatureInput = {
  organizationId: string;
  truckId: string;
  purchasedAtIsoDate: string;
  merchantName: string;
  gallons: number;
  totalAmount: number;
};

/** Stable normalized signature for likely-duplicate detection. */
export function duplicateReceiptSignature(input: DuplicateSignatureInput): string {
  return [
    input.organizationId,
    input.truckId,
    input.purchasedAtIsoDate,
    normalizeMerchant(input.merchantName),
    input.gallons.toFixed(3),
    input.totalAmount.toFixed(2),
  ].join("|");
}

export async function sha256Hex(bytes: ArrayBuffer | Uint8Array | string): Promise<string> {
  const data =
    typeof bytes === "string"
      ? new TextEncoder().encode(bytes)
      : bytes instanceof Uint8Array
        ? bytes
        : new Uint8Array(bytes);
  if (typeof Worker !== "undefined" && typeof window !== "undefined") {
    try {
      return await hashInWorker(data);
    } catch {
      // Fall through to the main thread if the worker cannot start.
    }
  }
  return hashOnThisThread(data);
}

async function hashOnThisThread(data: Uint8Array) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashInWorker(data: Uint8Array) {
  const source = `self.onmessage=async(e)=>{const digest=await crypto.subtle.digest("SHA-256",e.data);self.postMessage(digest);};`;
  const blob = new Blob([source], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<string>((resolve, reject) => {
      const copy = data.slice();
      const worker = new Worker(url);
      const timer = setTimeout(() => {
        worker.terminate();
        reject(new Error("hash worker timeout"));
      }, 8_000);
      worker.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        clearTimeout(timer);
        worker.terminate();
        resolve([...new Uint8Array(event.data)].map((b) => b.toString(16).padStart(2, "0")).join(""));
      };
      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        reject(new Error("hash worker failed"));
      };
      worker.postMessage(copy.buffer, [copy.buffer]);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
