import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { manageReceipt, verifySchema } from "@/lib/receipts/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireManagement();
    const { id } = await context.params;
    const payload = verifySchema.parse(await request.json());
    const result = await manageReceipt(user, id, payload);
    return apiOk(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "verify_failed", error instanceof Error ? error.message : "Could not update receipt.");
  }
}
