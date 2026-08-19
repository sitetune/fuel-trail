import { AuthError, requireOwner } from "@/lib/auth/session";
import { apiError } from "@/lib/api/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireOwner();
    const supabase = await createServerSupabaseClient();
    const [{ data: trucks }, { data: users }, { data: receipts }] = await Promise.all([
      supabase.from("trucks").select("id, unit_number, vin, license_plate, status, fuel_type"),
      supabase.from("profiles").select("id, full_name, email, role, is_active, last_seen_at"),
      supabase
        .from("fuel_receipts")
        .select("id, status, purchased_at, merchant_name, gallons, total_amount, merchant_region, last_reported_at, amended_at"),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        timezone: user.organization.timezone,
      },
      trucks: trucks ?? [],
      users: users ?? [],
      receipts: receipts ?? [],
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fueltrail-org-export.json"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "export_failed", "Could not export organization data.");
  }
}
