import { requireManagement } from "@/lib/auth/session";

export default async function AuditLogPage() {
  await requireManagement();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-semibold">Audit log</h1>
      <p className="text-sm text-muted">
        This page is suspended. Receipt field changes still appear on each receipt. CSV snapshots still appear on
        Reports.
      </p>
    </div>
  );
}
