import { z } from "zod";
import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { submitReceipt } from "@/lib/receipts/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const payload = await request.json();
    const result = await submitReceipt(user, id, payload);
    return apiOk(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    if (error instanceof z.ZodError) {
      return apiError(400, "invalid_input", "Review the highlighted receipt fields.");
    }
    return apiError(400, "submit_failed", error instanceof Error ? error.message : "Could not submit receipt.");
  }
}
