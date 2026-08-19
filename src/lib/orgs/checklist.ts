import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/domain";

export type LaunchChecklist = {
  companyDetails: boolean;
  truck: boolean;
  driver: boolean;
  invitationOrExtraUser: boolean;
  receipt: boolean;
  complete: boolean;
};

export async function loadLaunchChecklist(user: SessionUser): Promise<LaunchChecklist> {
  const supabase = await createServerSupabaseClient();
  const org = user.organization;
  const [{ count: trucks }, { count: drivers }, { count: users }, { count: receipts }] = await Promise.all([
    supabase.from("trucks").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "driver"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("fuel_receipts").select("*", { count: "exact", head: true }),
  ]);
  const companyDetails = Boolean(org.name && org.timezone && (org.address || org.base_jurisdiction));
  const truck = (trucks ?? 0) > 0;
  const driver = (drivers ?? 0) > 0;
  const invitationOrExtraUser = (users ?? 0) > 1;
  const receipt = (receipts ?? 0) > 0;
  return {
    companyDetails,
    truck,
    driver,
    invitationOrExtraUser,
    receipt,
    complete: companyDetails && truck && driver && invitationOrExtraUser && receipt,
  };
}
