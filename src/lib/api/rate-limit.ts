import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/http";

const LIMITS: Record<string, { windowSeconds: number; max: number }> = {
  ocr: { windowSeconds: 60, max: 8 },
  route: { windowSeconds: 60, max: 10 },
  invite: { windowSeconds: 3600, max: 20 },
  upload: { windowSeconds: 60, max: 12 },
};

export async function enforceRateLimit(input: {
  bucket: string;
  userId: string;
  organizationId: string;
}) {
  const rule = LIMITS[input.bucket] ?? { windowSeconds: 60, max: 30 };
  const since = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("bucket", input.bucket)
    .gte("created_at", since);
  if (error) {
    return null;
  }
  if ((count ?? 0) >= rule.max) {
    return apiError(
      429,
      "rate_limited",
      "Too many requests. Wait a minute and try again.",
    );
  }
  await supabase.from("rate_limit_events").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    bucket: input.bucket,
  });
  return null;
}
