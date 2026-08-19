import { createServiceRoleClient } from "@/lib/supabase/admin";

function displayStoragePath(input: {
  organizationId: string;
  truckId: string;
  receiptId: string;
  ext: string;
}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${input.organizationId}/${input.truckId}/${year}/${month}/${input.receiptId}/display-${crypto.randomUUID()}.${input.ext}`;
}

export async function storeDisplayCopy(input: {
  organizationId: string;
  truckId: string;
  receiptId: string;
  originalPath: string;
}) {
  const admin = createServiceRoleClient();
  const { data: file, error } = await admin.storage.from("fuel-receipts").download(input.originalPath);
  if (error || !file) return null;
  const bytes = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  let mime = "image/webp";
  try {
    const sharp = (await import("sharp")).default;
    output = await sharp(bytes).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  } catch {
    output = bytes;
    mime = file.type || "image/jpeg";
  }
  const ext = mime === "image/webp" ? "webp" : (input.originalPath.split(".").pop() ?? "jpg");
  const path = displayStoragePath({
    organizationId: input.organizationId,
    truckId: input.truckId,
    receiptId: input.receiptId,
    ext,
  });
  const upload = await admin.storage.from("fuel-receipts").upload(path, output, {
    contentType: mime,
    upsert: false,
  });
  if (upload.error) return null;
  return path;
}

export async function ensureDisplayCopy(input: {
  receiptId: string;
  organizationId: string;
  truckId: string;
  originalPath: string;
}) {
  try {
    const path = await storeDisplayCopy(input);
    if (!path) return null;
    const admin = createServiceRoleClient();
    await admin.from("fuel_receipts").update({ display_image_path: path }).eq("id", input.receiptId);
    return path;
  } catch {
    return null;
  }
}
