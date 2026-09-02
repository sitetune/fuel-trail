import { AuthError, requireSession, requireWriteManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { assertStoragePathForOrg } from "@/lib/auth/isolation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

import { orgLogoStoragePath } from "@/lib/receipts/paths";

export async function GET() {
  try {
    const user = await requireSession();
    const path = user.organization.logo_path;
    if (!path) return apiError(404, "logo_missing", "No company logo uploaded.");
    assertStoragePathForOrg(path, user.organization.id);
    const admin = createServiceRoleClient();
    const { data, error } = await admin.storage.from("fuel-receipts").download(path);
    if (error || !data) return apiError(404, "logo_missing", "No company logo uploaded.");
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": data.type || "image/webp",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "logo_failed", "Could not load company logo.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireWriteManagement();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError(400, "invalid_input", "Upload a PNG, JPEG, or WebP logo.");
    if (file.size > 2 * 1024 * 1024) return apiError(400, "invalid_input", "Logo must be 2 MB or smaller.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const output = await sharp(bytes).rotate().resize({ width: 256, height: 256, fit: "inside" }).webp({ quality: 80 }).toBuffer();
    const path = orgLogoStoragePath(user.organization.id);
    const admin = createServiceRoleClient();
    const upload = await admin.storage.from("fuel-receipts").upload(path, output, {
      contentType: "image/webp",
      upsert: false,
    });
    if (upload.error) return apiError(400, "logo_failed", "Could not store the logo.");
    const supabase = await createServerSupabaseClient();
    await supabase.from("organizations").update({ logo_path: path }).eq("id", user.organization.id);
    await supabase.from("app_audit_events").insert({
      organization_id: user.organization.id,
      actor_id: user.authUserId,
      entity_type: "organization",
      entity_id: user.organization.id,
      event_type: "logo_updated",
    });
    return Response.redirect(new URL("/manage/settings?saved=1", request.url), 303);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "logo_failed", "Could not upload company logo.");
  }
}
