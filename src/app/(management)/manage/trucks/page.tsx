import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canMutateFleet } from "@/lib/auth/roles";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TruckForm } from "@/components/management/truck-form";
import { CsvTemplateDownloads } from "@/components/management/csv-template-downloads";

export default async function TrucksPage() {
  const user = await requireManagement();
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
        <div className="mb-4 space-y-2">
          <p className="text-sm text-[#5E6B75]">Download a truck template, then import from Import Center.</p>
          <CsvTemplateDownloads kinds={["trucks"]} />
        </div>
        <div className="space-y-2">
          {(trucks ?? []).map((truck) => (
            <Link key={truck.id} href={`/manage/trucks/${truck.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Unit {truck.unit_number}</p>
                  <p className="text-sm text-[#5E6B75]">
                    {truck.tank_capacity_gallons} gal · {truck.target_mpg} MPG · {truck.status}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Open
                </Button>
              </Card>
            </Link>
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
