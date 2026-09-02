import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3021"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  RECEIPT_OCR_PROVIDER: z.enum(["mindee", "manual", "gemini", "openai", "auto"]).default("auto"),
  MINDEE_API_KEY: z.string().optional(),
  MINDEE_MODEL_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  FUEL_ROUTE_PROVIDER: z.enum(["manual", "here"]).default("manual"),
  HERE_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  SIGNUP_AUTO_ACTIVATE: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER_MONTHLY: z.string().optional(),
  STRIPE_PRICE_STARTER_ANNUAL: z.string().optional(),
  STRIPE_PRICE_GROWTH_MONTHLY: z.string().optional(),
  STRIPE_PRICE_GROWTH_ANNUAL: z.string().optional(),
  STRIPE_PRICE_FLEET_MONTHLY: z.string().optional(),
  STRIPE_PRICE_FLEET_ANNUAL: z.string().optional(),
  PLATFORM_ADMIN_EMAILS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
});

export function getPublicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerEnv() {
  return serverSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RECEIPT_OCR_PROVIDER: process.env.RECEIPT_OCR_PROVIDER,
    MINDEE_API_KEY: process.env.MINDEE_API_KEY,
    MINDEE_MODEL_ID: process.env.MINDEE_MODEL_ID,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || undefined,
    FUEL_ROUTE_PROVIDER: process.env.FUEL_ROUTE_PROVIDER,
    HERE_API_KEY: process.env.HERE_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    SIGNUP_AUTO_ACTIVATE: process.env.SIGNUP_AUTO_ACTIVATE,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    STRIPE_PRICE_STARTER_ANNUAL: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    STRIPE_PRICE_GROWTH_MONTHLY: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
    STRIPE_PRICE_GROWTH_ANNUAL: process.env.STRIPE_PRICE_GROWTH_ANNUAL,
    STRIPE_PRICE_FLEET_MONTHLY: process.env.STRIPE_PRICE_FLEET_MONTHLY,
    STRIPE_PRICE_FLEET_ANNUAL: process.env.STRIPE_PRICE_FLEET_ANNUAL,
    PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS,
    RESEND_API_KEY: process.env.RESEND_API_KEY?.trim() || undefined,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL?.trim() || undefined,
  });
}

export function hasSupabaseConfig() {
  const env = getPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
