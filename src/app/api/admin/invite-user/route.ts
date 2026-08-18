import { z } from "zod";
import { AuthError, requireOwner } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({
    email: z.email(),
  fullName: z.string().min(1),
  role: z.enum(["owner_admin", "manager", "driver"]),
  truckId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireOwner();
    const limited = await enforceRateLimit({
      bucket: "invite",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const body = bodySchema.parse(await request.json());
    const admin = createServiceRoleClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(body.email, {
      data: {
        full_name: body.fullName,
        role: body.role,
        organization_id: user.organization.id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    });
    if (error || !data.user) {
      return apiError(400, "invite_failed", "Could not send invite. Confirm Auth email settings.");
    }
    const supabase = await createServerSupabaseClient();
    await admin.from("profiles").upsert({
      id: data.user.id,
      organization_id: user.organization.id,
      full_name: body.fullName,
      email: body.email,
      role: body.role,
      is_active: true,
    });
    if (body.role === "driver" && body.truckId) {
      await admin.from("driver_truck_assignments").update({ ends_at: new Date().toISOString() })
        .eq("truck_id", body.truckId)
        .is("ends_at", null);
      await admin.from("driver_truck_assignments").insert({
        organization_id: user.organization.id,
        driver_id: data.user.id,
        truck_id: body.truckId,
        created_by: user.authUserId,
      });
    }
    await supabase.from("app_audit_events").insert({
      organization_id: user.organization.id,
      actor_id: user.authUserId,
      entity_type: "profile",
      entity_id: data.user.id,
      event_type: "user_invited",
      metadata: { email: body.email, role: body.role },
    });
    return apiOk({ userId: data.user.id }, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "invite_failed", "Could not invite user.");
  }
}
