import { z } from "zod";
import { AuthError, requireWriteManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { issueRoutePlanToDriver } from "@/lib/routing/issue-plan";

const bodySchema = z.object({
  planId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const user = await requireWriteManagement();
    const body = bodySchema.parse(await request.json());
    const result = await issueRoutePlanToDriver(user, body.planId, true);
    if (!result.ok) return apiError(400, "issue_failed", result.message);
    return apiOk({ issued: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "issue_failed", "Could not send the fuel-stop notification.");
  }
}
