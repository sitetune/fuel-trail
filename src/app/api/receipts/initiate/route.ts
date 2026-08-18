import { z } from "zod";
import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { initiateReceipt } from "@/lib/receipts/service";

const bodySchema = z.object({
  clientReceiptUuid: z.string().uuid(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const limited = await enforceRateLimit({
      bucket: "upload",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const json = bodySchema.parse(await request.json());
    const result = await initiateReceipt(user, json);
    return apiOk(result, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    if (error instanceof z.ZodError) {
      return apiError(400, "invalid_input", "Check the upload request and try again.");
    }
    return apiError(400, "initiate_failed", error instanceof Error ? error.message : "Could not start upload.");
  }
}
