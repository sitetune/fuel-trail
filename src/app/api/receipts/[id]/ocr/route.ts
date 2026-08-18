import { z } from "zod";
import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { runOcr } from "@/lib/receipts/service";

const bodySchema = z
  .object({
    rawText: z.string().max(20000).optional(),
  })
  .optional();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const limited = await enforceRateLimit({
      bucket: "ocr",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const { id } = await context.params;
    const json = await request.json().catch(() => ({}));
    const body = bodySchema.parse(json) ?? {};
    const extracted = await runOcr(user, id, { rawText: body.rawText });
    return apiOk({ extracted });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "ocr_failed", "OCR could not run. You can still enter the receipt manually.");
  }
}
