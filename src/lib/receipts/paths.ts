export function storageOriginalPath(input: {
  organizationId: string;
  truckId: string;
  receiptId: string;
  purchasedAt: Date;
  ext: string;
}) {
  const year = input.purchasedAt.getUTCFullYear();
  const month = String(input.purchasedAt.getUTCMonth() + 1).padStart(2, "0");
  return `${input.organizationId}/${input.truckId}/${year}/${month}/${input.receiptId}/original-${crypto.randomUUID()}.${input.ext}`;
}

export function orgLogoStoragePath(organizationId: string) {
  return `${organizationId}/branding/logo-${crypto.randomUUID()}.webp`;
}
