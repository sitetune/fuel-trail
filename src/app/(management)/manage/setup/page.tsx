import Link from "next/link";
import { redirect } from "next/navigation";
import { requireManagement } from "@/lib/auth/session";
import { loadLaunchChecklist } from "@/lib/orgs/checklist";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CsvTemplateDownloads } from "@/components/management/csv-template-downloads";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const user = await requireManagement();
  if (user.profile.role !== "owner_admin") redirect("/manage/settings");
  const params = await searchParams;
  const checklist = await loadLaunchChecklist(user);
  const items = [
    { ok: checklist.companyDetails, label: "Company details", href: "/manage/settings" },
    { ok: checklist.truck, label: "Add or import a truck", href: "/manage/trucks" },
    { ok: checklist.driver, label: "Invite or import a driver", href: "/manage/users" },
    { ok: checklist.invitationOrExtraUser, label: "More than the owner on the account", href: "/manage/users" },
    { ok: checklist.receipt, label: "Capture a test receipt", href: "/manage/receipts" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Launch checklist</h1>
        <p className="text-sm text-muted">
          Finish these items before asking drivers to use FuelTrail. You can keep working from the rest of Manage at any time.
        </p>
        {params.billing === "ok" ? (
          <p className="mt-2 text-sm text-success">Payment received. Your company is active.</p>
        ) : null}
      </div>
      <Card className="space-y-3">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className="flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2">
            <span>{item.ok ? "Done" : "To do"} · {item.label}</span>
            <span className="text-sm underline">Open</span>
          </Link>
        ))}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Import templates</h2>
        <CsvTemplateDownloads kinds={["trucks", "drivers", "assignments"]} />
        <Button asChild variant="primary">
          <Link href="/manage/import">Open Import Center</Link>
        </Button>
      </Card>
      {checklist.complete ? (
        <p className="text-success">This company is ready for a pilot.</p>
      ) : null}
    </div>
  );
}
