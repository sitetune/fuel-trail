import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { signedReceiptImage } from "@/lib/receipts/service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const original = new URL(request.url).searchParams.get("original") === "1";
    const result = await signedReceiptImage(user, id, { original });
    return apiOk(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(404, "image_unavailable", "Receipt image is not available.");
  }
}
