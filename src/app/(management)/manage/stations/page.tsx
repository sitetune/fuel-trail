import { Card } from "@/components/ui/card";
import { PriceImportForm } from "@/components/fuel-planning/price-import-form";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function StationsPage() {
  await requireManagement();
  const supabase = await createServerSupabaseClient();
  const { data: stations } = await supabase.from("fuel_stations").select("*").order("name");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Stations</h1>
      <div className="space-y-2">
        {(stations ?? []).map((station) => (
          <Card key={station.id}>
            <p className="font-semibold">{station.name}</p>
            <p className="text-sm text-[#5E6B75]">
              {station.city}, {station.region} · truck access {station.truck_access} · parking{" "}
              {station.parking_available}
              {station.trailer_policy === "drop_required" && !station.drop_location_verified_at
                ? " · drop required (unverified — excluded from default planning)"
                : ""}
            </p>
          </Card>
        ))}
      </div>
      <PriceImportForm />
    </div>
  );
}
