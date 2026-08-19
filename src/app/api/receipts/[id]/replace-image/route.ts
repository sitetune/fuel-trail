import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { completeImageReplace, initiateImageReplace } from "@/lib/receipts/service";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("stage", [
  z.object({
    stage: z.literal("initiate"),
    fileName: z.string().min(1),
  }),
  z.object({
    stage: z.literal("complete"),
    sha256: z.string().min(32),
  }),
]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const limited = await enforceRateLimit({
      bucket: "upload",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const { id } = await context.params;
    const body = bodySchema.parse(await request.json());
    if (body.stage === "initiate") {
      return apiOk(await initiateImageReplace(user, id, body.fileName));
    }
    return apiOk(await completeImageReplace(user, id, body.sha256));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    if (error instanceof z.ZodError) {
      return apiError(400, "invalid_input", "Check the replacement upload and try again.");
    }
    return apiError(400, "replace_failed", error instanceof Error ? error.message : "Could not replace the receipt image.");
  }
}
