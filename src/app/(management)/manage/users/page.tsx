import { UsersManager } from "@/components/management/users-manager";
import { requireManagement } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireManagement();
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: users } = await supabase.from("profiles").select("*").order("full_name");
  const { data: trucks } = await supabase.from("trucks").select("id, unit_number").eq("status", "active");
  return (
    <UsersManager
      users={users ?? []}
      trucks={trucks ?? []}
      canInvite={user.profile.role === "owner_admin"}
      error={params.error === "last-owner" ? "Cannot deactivate the last active owner." : undefined}
    />
  );
}
