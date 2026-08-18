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
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
