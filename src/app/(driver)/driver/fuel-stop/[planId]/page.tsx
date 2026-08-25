import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FuelStopAssignment } from "@/components/driver/fuel-stop-assignment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { DRIVER_FUEL_STOP_SELECT, resolveDriverFuelStop } from "@/lib/routing/driver-stop";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DriverFuelStopPage({ params }: { params: Promise<{ planId: string }> }) {
  const user = await requireSession();
  if (user.profile.role !== "driver") redirect("/manage");
  const { planId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: plan } = await supabase
    .from("route_plans")
    .select(DRIVER_FUEL_STOP_SELECT)
    .eq("id", planId)
    .eq("status", "issued")
    .maybeSingle();
  if (!plan) notFound();

  const stop = resolveDriverFuelStop(plan as import("@/lib/routing/driver-stop").DriverFuelStopPlan);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="-ml-2">
        <Link href="/driver">Back to home</Link>
      </Button>
      <Card className="space-y-4 p-5">
        <FuelStopAssignment stop={stop} variant="page" />
      </Card>
      <Button asChild variant="primary" size="lg" className="w-full">
        <Link href="/driver/receipts/new">Add receipt after fueling</Link>
      </Button>
    </div>
  );
}
