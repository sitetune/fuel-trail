import { FleetImportForm } from "@/components/management/fleet-import-form";
import { CsvTemplateDownloads } from "@/components/management/csv-template-downloads";
import { Card } from "@/components/ui/card";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ImportCenterPage() {
  await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: jobs } = await supabase
    .from("import_jobs")
    .select("id, kind, source_filename, status, row_count, success_count, error_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Import Center</h1>
        <p className="text-sm text-[#5E6B75]">
          Start with a downloadable CSV template. Import trucks and drivers here; station prices also live on Stations.
        </p>
      </div>
      <Card className="space-y-3">
        <h2 className="font-semibold">CSV templates</h2>
        <CsvTemplateDownloads />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <FleetImportForm />
        <Card>
          <h2 className="font-semibold">Import history</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(jobs ?? []).length === 0 ? <li>No imports yet.</li> : null}
            {(jobs ?? []).map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {job.kind ?? "import"} · {job.source_filename} · {job.status} · {job.success_count}/{job.row_count} ·{" "}
                  {new Date(job.created_at).toLocaleString()}
                </span>
                {Number(job.error_count) > 0 ? (
                  <Link className="underline" href={`/api/imports/jobs/${job.id}/errors.csv`}>
                    Error CSV
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
