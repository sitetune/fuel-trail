import { z } from "zod";
import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { completeUpload } from "@/lib/receipts/service";

const bodySchema = z.object({ sha256: z.string().min(32) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const json = bodySchema.parse(await request.json());
    const result = await completeUpload(user, id, json.sha256);
    return apiOk(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "upload_complete_failed", error instanceof Error ? error.message : "Upload could not be confirmed.");
  }
}
