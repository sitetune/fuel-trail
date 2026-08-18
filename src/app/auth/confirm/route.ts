import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/login";
  const supabase = await createServerSupabaseClient();
  if (token_hash && type) {
    await supabase.auth.verifyOtp({
      type: type as "email" | "invite" | "recovery" | "email_change" | "signup",
      token_hash,
    });
  }
  const code = searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, request.url));
}
