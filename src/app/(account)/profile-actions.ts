"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateOwnProfileAction(formData: FormData) {
  const user = await requireSession();
  const supabase = await createServerSupabaseClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const dest = user.profile.role === "driver" ? "/driver/profile" : "/manage/profile";
  if (fullName.length < 2) {
    redirect(`${dest}?error=name`);
  }
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
    })
    .eq("id", user.authUserId);
  if (profileError) {
    redirect(`${dest}?error=save`);
  }
  if (email && email !== user.profile.email.toLowerCase()) {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      redirect(`${dest}?error=email`);
    }
    redirect(`${dest}?pending=${encodeURIComponent(email)}`);
  }
  redirect(`${dest}?saved=1`);
}
