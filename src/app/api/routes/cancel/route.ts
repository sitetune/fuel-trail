import { z } from "zod";
import { AuthError, getSessionUser } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { cancelRoutePlan } from "@/lib/routing/issue-plan";

const bodySchema = z.object({
  planId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Sign in required.", "unauthenticated");
    const body = bodySchema.parse(await request.json());
    const result = await cancelRoutePlan(user, body.planId);
    if (!result.ok) return apiError(400, "cancel_failed", result.message);
    return apiOk({ cancelled: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "cancel_failed", "Could not remove the fuel stop.");
  }
}
