/**
 * Bootstrap the first owner. Run locally after migrations:
 *   pnpm bootstrap:owner
 * Never expose this as an HTTP endpoint.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env";

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.BOOTSTRAP_OWNER_EMAIL;
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
  const name = process.env.BOOTSTRAP_OWNER_NAME ?? "Owner";
  const orgName = process.env.BOOTSTRAP_ORG_NAME ?? "Gulf Coast Haul";

  if (!url || !service || !email || !password) {
    console.error(
      "Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_OWNER_EMAIL, BOOTSTRAP_OWNER_PASSWORD.",
    );
    process.exit(1);
  }

  const admin = createClient(url, service, { auth: { persistSession: false } });

  const { data: existing } = await admin.from("profiles").select("id").eq("role", "owner_admin").limit(1);
  if (existing && existing.length > 0) {
    console.log("An owner already exists. Aborting.");
    process.exit(0);
  }

  let orgId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const { data: org } = await admin.from("organizations").select("id").eq("id", orgId).maybeSingle();
  if (!org) {
    const created = await admin
      .from("organizations")
      .insert({ id: orgId, name: orgName, slug: "gulf-coast-haul", base_jurisdiction: "TX" })
      .select("id")
      .single();
    orgId = created.data?.id ?? orgId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: "owner_admin" },
  });
  if (error || !data.user) {
    console.error(error?.message ?? "Could not create owner");
    process.exit(1);
  }

  await admin.from("profiles").upsert({
    id: data.user.id,
    organization_id: orgId,
    full_name: name,
    email,
    role: "owner_admin",
    is_active: true,
  });

  console.log(
    `Owner created for ${email}. Sign in at ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3021"}/login`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
