import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { csvFileResponse } from "@/lib/imports/templates";
import { toCsv } from "@/lib/reports/csv";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireManagement();
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data: job } = await supabase
      .from("import_jobs")
      .select("id, errors, source_filename")
      .eq("id", id)
      .single();
    if (!job) return apiError(404, "not_found", "Import job not found.");
    const errors = Array.isArray(job.errors) ? job.errors : [];
    const csv = toCsv(
      ["rowNumber", "message"],
      errors.map((row) => {
        const record = row as { rowNumber?: number; message?: string };
        return [record.rowNumber ?? "", record.message ?? ""];
      }),
    );
    return csvFileResponse(`fueltrail-import-errors.csv`, csv);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "export_failed", "Could not export import errors.");
  }
}
