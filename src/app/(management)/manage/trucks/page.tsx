import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TruckForm } from "@/components/management/truck-form";

export default async function TrucksPage() {
  await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: trucks } = await supabase.from("trucks").select("*").order("unit_number");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-3xl font-semibold">Trucks</h1>
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
      <div>
        <h2 className="mb-4 text-xl font-semibold">Add truck</h2>
        <TruckForm />
      </div>
    </div>
  );
}
