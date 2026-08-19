import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import {
  IMPORT_TEMPLATE_KINDS,
  csvFileResponse,
  importTemplateCsv,
  importTemplateFilename,
  type ImportTemplateKind,
} from "@/lib/imports/templates";

export async function GET(_request: Request, context: { params: Promise<{ kind: string }> }) {
  try {
    await requireManagement();
    const { kind } = await context.params;
    if (!IMPORT_TEMPLATE_KINDS.includes(kind as ImportTemplateKind)) {
      return apiError(404, "unknown_template", "Unknown CSV template.");
    }
    const templateKind = kind as ImportTemplateKind;
    return csvFileResponse(importTemplateFilename(templateKind), importTemplateCsv(templateKind));
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "template_failed", "Could not download template.");
  }
}
