import { AuthError, requireManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { validateFuelPriceCsv } from "@/lib/reports/csv";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { managementRecipientIds, notify } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const user = await requireManagement();
    const form = await request.formData();
    const file = form.get("file");
    const commit = form.get("commit") === "true";
    if (!(file instanceof File)) {
      return apiError(400, "invalid_input", "Upload a CSV file.");
    }
    const text = await file.text();
    const { valid, errors } = validateFuelPriceCsv(text);
    const supabase = await createServerSupabaseClient();
    const { data: job } = await supabase
      .from("import_jobs")
      .insert({
        organization_id: user.organization.id,
        uploaded_by: user.authUserId,
        source_filename: file.name,
        kind: "fuel_prices",
        status: commit ? "committed" : "validated",
        row_count: valid.length + errors.length,
        success_count: commit ? valid.length : 0,
        error_count: errors.length,
        errors,
      })
      .select("id")
      .single();
    if (commit) {
      for (const row of valid) {
        const { data: station } = await supabase
          .from("fuel_stations")
          .insert({
            organization_id: user.organization.id,
            name: row.station_name,
            address: row.address,
            city: row.city,
            region: row.state,
            postal_code: row.zip,
            latitude: row.latitude,
            longitude: row.longitude,
            truck_access: row.truck_access,
            parking_available: row.parking_available,
            trailer_policy: row.trailer_policy,
            drop_location_name: row.drop_location,
            manager_notes: row.notes,
          })
          .select("id")
          .single();
        if (station) {
          await supabase.from("fuel_price_snapshots").insert({
            organization_id: user.organization.id,
            station_id: station.id,
            fuel_type: row.fuel_type,
            cash_price: row.price,
            credit_price: row.price,
            observed_at: row.observed_at,
            source: "csv_import",
            source_reference: job?.id,
          });
        }
      }
      await notify({
        organizationId: user.organization.id,
        recipientIds: await managementRecipientIds(user.organization.id),
        eventType: "import_completed",
        title: "Price import completed",
        body: `Imported ${valid.length} station price row${valid.length === 1 ? "" : "s"}.`,
        href: "/manage/savings",
        entityType: "import_job",
        entityId: job?.id,
      });
    }
    return apiOk({ jobId: job?.id, validCount: valid.length, errors, preview: valid.slice(0, 25) });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "import_failed", "Could not import fuel prices.");
  }
}
