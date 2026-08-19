import { zipSync } from "fflate";
import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { assertStoragePathForOrg } from "@/lib/auth/isolation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const BATCH_LIMIT = 25;

function zipName(receipt: {
  id: string;
  merchant_name: string | null;
  purchased_at: string | null;
  original_image_path: string;
  trucks: { unit_number?: string } | null;
}) {
  const unit = receipt.trucks?.unit_number ?? "unit";
  const date = (receipt.purchased_at ?? "").slice(0, 10) || "undated";
  const merchant = (receipt.merchant_name ?? "receipt").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const ext = receipt.original_image_path.split(".").pop() || "jpg";
  return `${unit}-${date}-${merchant}-${receipt.id.slice(0, 8)}.${ext}`.toLowerCase();
}

export async function GET(request: Request) {
  try {
    const user = await requireManagement();
    const ids = new URL(request.url).searchParams
      .get("ids")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, BATCH_LIMIT);
    if (!ids?.length) return apiError(400, "invalid_input", "Select receipts to download.");
    const supabase = await createServerSupabaseClient();
    const { data: receipts } = await supabase
      .from("fuel_receipts")
      .select("id, merchant_name, purchased_at, original_image_path, organization_id, trucks(unit_number)")
      .eq("organization_id", user.organization.id)
      .in("id", ids);
    if (!receipts?.length) return apiError(404, "not_found", "No matching receipts.");
    const admin = createServiceRoleClient();
    const files: Record<string, Uint8Array> = {};
    for (const receipt of receipts) {
      const path = receipt.original_image_path as string | null;
      if (!path) continue;
      assertStoragePathForOrg(path, user.organization.id);
      const { data, error } = await admin.storage.from("fuel-receipts").download(path);
      if (error || !data) continue;
      files[zipName(receipt as never)] = new Uint8Array(await data.arrayBuffer());
    }
    if (!Object.keys(files).length) return apiError(404, "not_found", "Receipt images were not available.");
    const zip = zipSync(files);
    return new Response(Buffer.from(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="fueltrail-receipts.zip"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "export_failed", "Could not build a ZIP of receipt originals.");
  }
}
