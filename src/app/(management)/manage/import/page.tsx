import { FleetImportForm } from "@/components/management/fleet-import-form";
import { Card } from "@/components/ui/card";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ImportCenterPage() {
  await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: jobs } = await supabase
    .from("import_jobs")
    .select("id, kind, source_filename, status, row_count, success_count, error_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Fleet import</h1>
        <FleetImportForm />
      </div>
      <Card>
        <h2 className="font-semibold">Import history</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(jobs ?? []).length === 0 ? <li>No imports yet.</li> : null}
          {(jobs ?? []).map((job) => (
            <li key={job.id}>
              {job.kind ?? "import"} · {job.source_filename} · {job.status} · {job.success_count}/{job.row_count} ·{" "}
              {new Date(job.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
