import { AuthError, requireSession } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { receiptImageBytes } from "@/lib/receipts/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await context.params;
    const image = await receiptImageBytes(user, id);
    return new Response(image.bytes, {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(404, "image_unavailable", "Receipt image is not available.");
  }
}
