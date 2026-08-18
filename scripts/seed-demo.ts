/**
 * Creates demo manager/drivers and 20+ receipts across two months.
 *   pnpm seed:demo
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env";

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const orgId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const password = process.env.DEMO_PASSWORD ?? "FuelTrail-demo-1";

  async function ensureUser(email: string, fullName: string, role: "manager" | "driver") {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    let id = created.data.user?.id;
    if (!id) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      id = list.users.find((user) => user.email === email)?.id;
    }
    if (!id) throw new Error(created.error?.message ?? `Could not create ${email}`);
    await admin.from("profiles").upsert({
      id,
      organization_id: orgId,
      full_name: fullName,
      email,
      role,
      is_active: true,
    });
    return id;
  }

  const managerId = await ensureUser("manager@gulfcoasthaul.example", "Morgan Manager", "manager");
  const driverA = await ensureUser("driver.a@gulfcoasthaul.example", "Alex Driver", "driver");
  const driverB = await ensureUser("driver.b@gulfcoasthaul.example", "Blake Driver", "driver");

  await admin.from("driver_truck_assignments").insert([
    {
      organization_id: orgId,
      driver_id: driverA,
      truck_id: "11111111-1111-4111-8111-111111111111",
      created_by: managerId,
    },
    {
      organization_id: orgId,
      driver_id: driverB,
      truck_id: "22222222-2222-4222-8222-222222222222",
      created_by: managerId,
    },
  ]);

  const merchants = [
    { name: "Pilot Baytown", city: "Baytown", region: "TX", address: "550 I-10" },
    { name: "Love's Humble", city: "Humble", region: "TX", address: "19711 US-59" },
    { name: "TA Brookshire", city: "Brookshire", region: "TX", address: "100 I-10" },
    { name: "Sapp Bros San Antonio", city: "San Antonio", region: "TX", address: "1200 I-35" },
  ];

  const receipts = Array.from({ length: 22 }, (_, index) => {
    const merchant = merchants[index % merchants.length];
    const truckId =
      index % 2 === 0
        ? "11111111-1111-4111-8111-111111111111"
        : "22222222-2222-4222-8222-222222222222";
    const driverId = index % 2 === 0 ? driverA : driverB;
    const month = index < 11 ? "07" : "08";
    const day = String((index % 11) + 1).padStart(2, "0");
    const gallons = 80 + (index % 7) * 5;
    const price = 3.35 + (index % 5) * 0.04;
    const status =
      index === 0 ? "needs_review" : index === 1 ? "submitted" : index === 2 ? "rejected" : "verified";
    return {
      organization_id: orgId,
      truck_id: truckId,
      driver_id: driverId,
      status,
      purchased_at: `2026-${month}-${day}T14:00:00Z`,
      merchant_name: merchant.name,
      merchant_address: merchant.address,
      merchant_city: merchant.city,
      merchant_region: merchant.region,
      purchaser_name: index % 2 === 0 ? "Alex Driver" : "Blake Driver",
      fuel_type: "diesel",
      gallons,
      price_per_gallon: price,
      total_amount: Number((gallons * price).toFixed(2)),
      odometer: 180000 + index * 320,
      original_image_path: `${orgId}/${truckId}/2026/${month}/seed-${index}/original-seed.jpg`,
      original_sha256: `seedhash${index}`,
      receipt_signature: index === 3 ? "duplicate-demo" : `sig-${index}`,
      duplicate_of: null,
      ocr_confidence: index === 0 ? 0.31 : 0.92,
      ocr_provider: "manual",
    };
  });
  receipts[4].receipt_signature = "duplicate-demo";
  receipts[4].status = "needs_review";

  await admin.from("fuel_receipts").insert(receipts);

  await admin.from("fuel_level_estimates").insert([
    {
      organization_id: orgId,
      truck_id: "11111111-1111-4111-8111-111111111111",
      estimated_after_gallons: 165,
      confidence: "high",
      method: "driver_full",
      calculation_json: { seed: true },
    },
    {
      organization_id: orgId,
      truck_id: "22222222-2222-4222-8222-222222222222",
      estimated_after_gallons: 48,
      confidence: "low",
      method: "odometer_model",
      calculation_json: { seed: true },
    },
    {
      organization_id: orgId,
      truck_id: "33333333-3333-4333-8333-333333333333",
      estimated_after_gallons: null,
      confidence: "unknown",
      method: "unknown",
      calculation_json: { seed: true },
    },
  ]);

  await admin.from("route_plans").insert({
    organization_id: orgId,
    truck_id: "11111111-1111-4111-8111-111111111111",
    driver_id: driverA,
    created_by: managerId,
    origin_text: "Baytown, TX",
    origin_latitude: 29.7355,
    origin_longitude: -94.9774,
    destination_text: "Conroe, TX",
    destination_latitude: 30.3119,
    destination_longitude: -95.4561,
    route_distance_miles: 58,
    current_estimated_gallons: 80,
    recommended_station_id: "aaaa1111-1111-4111-8111-111111111111",
    recommended_purchase_gallons: 115,
    recommendation_explanation: {
      explanation:
        "Stop at Pilot Travel Center Baytown. Buy 115 gallons. Trailer can remain attached.",
    },
    trailer_attached: true,
    status: "issued",
  });

  console.log("Demo users:");
  console.log("  manager@gulfcoasthaul.example");
  console.log("  driver.a@gulfcoasthaul.example");
  console.log("  driver.b@gulfcoasthaul.example");
  console.log(`Password: ${password}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
