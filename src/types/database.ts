/**
 * Hand-maintained until a live project can run:
 *   pnpm db:types
 * which wraps `supabase gen types typescript`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      trucks: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      fuel_receipts: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Views: {
      latest_fuel_estimates: { Row: Record<string, unknown> };
      monthly_truck_fuel_metrics: { Row: Record<string, unknown> };
      quarterly_fuel_purchases: { Row: Record<string, unknown> };
      station_latest_prices: { Row: Record<string, unknown> };
      receipt_review_counts: { Row: Record<string, unknown> };
    };
    Functions: Record<string, never>;
    Enums: {
      app_role: "owner_admin" | "manager" | "driver";
    };
  };
};
