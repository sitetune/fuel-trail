export const ROLES = ["owner_admin", "manager", "driver"] as const;
export type Role = (typeof ROLES)[number];

export const TRUCK_STATUSES = ["active", "maintenance", "inactive"] as const;
export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export const RECEIPT_STATUSES = [
  "draft",
  "processing",
  "needs_review",
  "submitted",
  "verified",
  "rejected",
  "archived",
] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const TANK_LEVEL_MODES = ["unknown", "full", "percent", "gallons"] as const;
export type TankLevelMode = (typeof TANK_LEVEL_MODES)[number];

export const ESTIMATE_CONFIDENCE = ["high", "medium", "low", "unknown"] as const;
export type EstimateConfidence = (typeof ESTIMATE_CONFIDENCE)[number];

export const ESTIMATE_METHODS = [
  "driver_full",
  "driver_percent",
  "driver_gallons",
  "odometer_model",
  "baseline",
  "unknown",
] as const;
export type EstimateMethod = (typeof ESTIMATE_METHODS)[number];

export const AUDIT_EVENT_TYPES = [
  "captured",
  "uploaded",
  "ocr_completed",
  "ocr_failed",
  "field_corrected",
  "submitted",
  "resubmitted",
  "verified",
  "rejected",
  "duplicate_overridden",
  "archived",
  "image_replaced",
] as const;
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const PRICE_SOURCES = ["manager", "csv_import", "receipt", "provider"] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

export const YES_NO_UNKNOWN = ["yes", "no", "unknown"] as const;
export type YesNoUnknown = (typeof YES_NO_UNKNOWN)[number];

export const TRAILER_POLICIES = ["stay_attached", "drop_required", "unknown"] as const;
export type TrailerPolicy = (typeof TRAILER_POLICIES)[number];

export const ROUTE_PLAN_STATUSES = [
  "draft",
  "issued",
  "accepted",
  "completed",
  "cancelled",
] as const;
export type RoutePlanStatus = (typeof ROUTE_PLAN_STATUSES)[number];

export type Profile = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  last_seen_at: string | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  base_jurisdiction: string | null;
  timezone: string;
  currency: string;
  default_tank_capacity_gallons: number;
  default_target_mpg: number;
  default_week_start_min_gallons: number;
  default_reserve_gallons: number;
  default_cost_per_mile: number | null;
  default_driver_time_value_hourly: number | null;
  default_trailer_drop_penalty: number | null;
  comparison_radius_miles: number;
  price_freshness_hours: number;
  price_mismatch_tolerance: number;
  retention_years: number;
  default_fuel_type?: string;
  address?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
};

export type Truck = {
  id: string;
  organization_id: string;
  unit_number: string;
  vin: string | null;
  license_plate: string | null;
  license_state: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  tank_capacity_gallons: number;
  target_mpg: number;
  week_start_min_gallons: number;
  reserve_gallons: number;
  status: TruckStatus;
  fuel_type?: string;
  notes?: string | null;
  baseline_fuel_gallons: number | null;
  baseline_odometer: number | null;
  baseline_recorded_at: string | null;
};

export type SessionUser = {
  authUserId: string;
  profile: Profile;
  organization: Organization;
};
