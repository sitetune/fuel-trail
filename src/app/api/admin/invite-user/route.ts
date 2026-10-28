import { z } from "zod";
import { AuthError, requireWriteManagement } from "@/lib/auth/session";
import { apiError, apiOk } from "@/lib/api/http";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { assertPlanAllows, PlanLimitError } from "@/lib/billing/assert";
import { inviteOrganizationUser } from "@/lib/orgs/invite";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  email: z.email(),
  fullName: z.string().min(1),
  role: z.enum(["owner_admin", "manager", "auditor", "driver"]),
  truckId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireWriteManagement();
    const limited = await enforceRateLimit({
      bucket: "invite",
      userId: user.authUserId,
      organizationId: user.organization.id,
    });
    if (limited) return limited;
    const body = bodySchema.parse(await request.json());
    const role = user.profile.role === "manager" ? "driver" : body.role;
    if (user.profile.role === "manager" && body.role !== "driver") {
      return apiError(403, "forbidden", "Managers can invite drivers only.");
    }
    try {
      assertPlanAllows(user.organization, role === "auditor" ? "invite_auditor" : "invite_user");
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return apiError(403, error.code, error.message);
      }
      throw error;
    }
    const invited = await inviteOrganizationUser({
      email: body.email,
      fullName: body.fullName,
      role,
      organizationId: user.organization.id,
      organizationName: user.organization.name,
    });
    const admin = createServiceRoleClient();
    if (role === "driver" && body.truckId) {
      await admin
        .from("driver_truck_assignments")
        .update({ ends_at: new Date().toISOString() })
        .eq("truck_id", body.truckId)
        .is("ends_at", null);
      await admin.from("driver_truck_assignments").insert({
        organization_id: user.organization.id,
        driver_id: invited.userId,
        truck_id: body.truckId,
        created_by: user.authUserId,
      });
    }
    const supabase = await createServerSupabaseClient();
    await supabase.from("app_audit_events").insert({
      organization_id: user.organization.id,
      actor_id: user.authUserId,
      entity_type: "profile",
      entity_id: invited.userId,
      event_type: "user_invited",
      metadata: { email: body.email, role, emailed: invited.emailed },
    });
    return apiOk(
      {
        userId: invited.userId,
        emailed: invited.emailed,
        inviteUrl: invited.inviteUrl,
      },
      201,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error.code === "unauthenticated" ? 401 : 403, error.code, error.message);
    }
    return apiError(400, "invite_failed", error instanceof Error ? error.message : "Could not invite user.");
  }
}
