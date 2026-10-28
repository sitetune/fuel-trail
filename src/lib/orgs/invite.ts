import { sendInviteEmail } from "@/lib/notifications/email";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function inviteOrganizationUser(input: {
  email: string;
  fullName: string;
  role: "owner_admin" | "manager" | "auditor" | "driver";
  organizationId: string;
  organizationName: string;
  phone?: string | null;
}) {
  const admin = createServiceRoleClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3021"}/auth/confirm`;
  let generated = await admin.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: {
      data: {
        full_name: input.fullName,
        role: input.role,
        organization_id: input.organizationId,
      },
      redirectTo,
    },
  });
  if (generated.error && /already|registered|exists/i.test(generated.error.message)) {
    generated = await admin.auth.admin.generateLink({
      type: "recovery",
      email: input.email,
      options: { redirectTo },
    });
  }
  const { data, error } = generated;
  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create the invite.");
  }
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    organization_id: input.organizationId,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    role: input.role,
    is_active: true,
  });
  if (profileError) {
    throw new Error("Invite was created but the profile could not be saved.");
  }
  const actionLink = data.properties?.action_link ?? null;
  let emailed = false;
  if (actionLink) {
    const sent = await sendInviteEmail({
      to: input.email,
      fullName: input.fullName,
      organizationName: input.organizationName,
      actionLink,
    });
    emailed = sent === "sent";
  }
  return {
    userId: data.user.id as string,
    emailed,
    inviteUrl: emailed ? null : actionLink,
  };
}
