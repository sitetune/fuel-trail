import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canMutateFleet } from "@/lib/auth/roles";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ConfirmSubmit } from "@/components/management/confirm-submit";
import { TruckForm } from "@/components/management/truck-form";
import { CsvTemplateDownloads } from "@/components/management/csv-template-downloads";
import { setTruckStatusAction } from "../actions";

export default async function TrucksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireManagement();
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: trucks } = await supabase.from("trucks").select("*").order("unit_number");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold">Trucks</h1>
          <Button asChild variant="outline">
            <Link href="/manage/import">Import CSV</Link>
          </Button>
        </div>
        {params.error ? <p className="mb-3 text-sm text-alert">{params.error}</p> : null}
        <div className="mb-4 space-y-2">
          <p className="text-sm text-muted">Download a truck template, then import from Import Center.</p>
          <CsvTemplateDownloads kinds={["trucks"]} />
        </div>
        <div className="space-y-2">
          {(trucks ?? []).map((truck) => (
            <Card key={truck.id} className="flex items-center justify-between gap-3">
              <Link href={`/manage/trucks/${truck.id}`} className="min-w-0 flex-1">
                <p className="font-semibold">Unit {truck.unit_number}</p>
                <p className="text-sm text-muted">
                  {truck.tank_capacity_gallons} gal · {truck.target_mpg} MPG · {truck.status}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {canMutateFleet(user.profile.role) && truck.status === "inactive" ? (
                  <ConfirmSubmit
                    action={setTruckStatusAction}
                    message={`Restore unit ${truck.unit_number} to the active fleet?`}
                    variant="success"
                    hidden={{ id: truck.id, status: "active" }}
                  >
                    Restore
                  </ConfirmSubmit>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/manage/trucks/${truck.id}`}>Open</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {canMutateFleet(user.profile.role) ? (
      <div>
        <h2 className="mb-4 text-xl font-semibold">Add truck</h2>
        <TruckForm />
      </div>
      ) : null}
    </div>
  );
}
