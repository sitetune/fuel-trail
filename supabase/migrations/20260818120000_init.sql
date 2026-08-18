-- FuelTrail core schema
-- UUID keys, numeric money/gallons, organization-scoped, auditable.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create type public.app_role as enum ('owner_admin', 'manager', 'driver');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.truck_status as enum ('active', 'maintenance', 'inactive');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.receipt_status as enum (
    'draft', 'processing', 'needs_review', 'submitted', 'verified', 'rejected', 'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.tank_level_mode as enum ('unknown', 'full', 'percent', 'gallons');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estimate_confidence as enum ('high', 'medium', 'low', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estimate_method as enum (
    'driver_full', 'driver_percent', 'driver_gallons', 'odometer_model', 'baseline', 'unknown'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.receipt_audit_event_type as enum (
    'captured', 'uploaded', 'ocr_completed', 'ocr_failed', 'field_corrected',
    'submitted', 'verified', 'rejected', 'duplicate_overridden', 'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.yes_no_unknown as enum ('yes', 'no', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.trailer_policy as enum ('stay_attached', 'drop_required', 'unknown');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.price_source as enum ('manager', 'csv_import', 'receipt', 'provider');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.route_plan_status as enum ('draft', 'issued', 'accepted', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.import_job_status as enum ('pending', 'validated', 'committed', 'failed');
exception when duplicate_object then null;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  base_jurisdiction text,
  timezone text not null default 'America/Chicago',
  currency text not null default 'USD',
  default_tank_capacity_gallons numeric(10,2) not null default 200,
  default_target_mpg numeric(6,2) not null default 6.5,
  default_week_start_min_gallons numeric(10,2) not null default 100,
  default_reserve_gallons numeric(10,2) not null default 25,
  default_cost_per_mile numeric(10,4),
  default_driver_time_value_hourly numeric(10,2),
  default_trailer_drop_penalty numeric(10,2) default 0,
  comparison_radius_miles numeric(8,2) not null default 15,
  price_freshness_hours integer not null default 72,
  price_mismatch_tolerance numeric(6,4) not null default 0.08,
  retention_years integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_retention_years_chk check (retention_years >= 4),
  constraint organizations_jurisdiction_chk check (
    base_jurisdiction is null or char_length(base_jurisdiction) = 2
  )
);

comment on column public.organizations.retention_years is
  'Minimum receipt retention in years. IFTA-related records must be kept at least 4 years.';
comment on column public.organizations.base_jurisdiction is
  'Two-letter US state or Canadian province code.';

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  full_name text not null,
  email text not null,
  phone text,
  role public.app_role not null,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_organization_id_idx on public.profiles (organization_id);
create index if not exists profiles_email_idx on public.profiles (email);

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  unit_number text not null,
  vin text,
  license_plate text,
  license_state text,
  year integer,
  make text,
  model text,
  tank_capacity_gallons numeric(10,2) not null default 200,
  target_mpg numeric(6,2) not null default 6.5,
  week_start_min_gallons numeric(10,2) not null default 100,
  reserve_gallons numeric(10,2) not null default 25,
  status public.truck_status not null default 'active',
  baseline_fuel_gallons numeric(10,2),
  baseline_odometer numeric(12,1),
  baseline_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, unit_number),
  constraint trucks_capacity_chk check (tank_capacity_gallons > 0),
  constraint trucks_mpg_chk check (target_mpg > 0)
);

create index if not exists trucks_organization_id_idx on public.trucks (organization_id);

create table if not exists public.driver_truck_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  driver_id uuid not null references public.profiles (id) on delete restrict,
  truck_id uuid not null references public.trucks (id) on delete restrict,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_dates_chk check (ends_at is null or ends_at > starts_at)
);

create index if not exists assignments_driver_idx on public.driver_truck_assignments (driver_id, starts_at desc);
create index if not exists assignments_truck_idx on public.driver_truck_assignments (truck_id, starts_at desc);

create unique index if not exists assignments_one_active_driver_per_truck
  on public.driver_truck_assignments (truck_id)
  where ends_at is null;

create unique index if not exists assignments_one_active_truck_per_driver
  on public.driver_truck_assignments (driver_id)
  where ends_at is null;

create table if not exists public.fuel_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  truck_id uuid not null references public.trucks (id) on delete restrict,
  driver_id uuid not null references public.profiles (id) on delete restrict,
  assignment_id uuid references public.driver_truck_assignments (id),
  status public.receipt_status not null default 'draft',
  purchased_at timestamptz,
  purchase_timezone text,
  merchant_name text,
  merchant_address text,
  merchant_city text,
  merchant_region text,
  merchant_postal_code text,
  merchant_latitude numeric(9,6),
  merchant_longitude numeric(9,6),
  receipt_number text,
  purchaser_name text,
  fuel_type text not null default 'diesel',
  gallons numeric(10,3),
  price_per_gallon numeric(10,4),
  price_per_gallon_derived boolean not null default false,
  subtotal_amount numeric(12,2),
  tax_amount numeric(12,2),
  total_amount numeric(12,2),
  odometer numeric(12,1),
  payment_last4 text,
  tank_level_after_mode public.tank_level_mode not null default 'unknown',
  tank_level_after_value numeric(10,2),
  trailer_attached boolean,
  trailer_dropped boolean not null default false,
  trailer_parking_notes text,
  driver_note text,
  original_image_path text,
  display_image_path text,
  original_sha256 text,
  receipt_signature text,
  ocr_provider text,
  ocr_provider_document_id text,
  ocr_confidence numeric(5,4),
  ocr_raw_json jsonb,
  ocr_extracted_json jsonb,
  client_receipt_uuid uuid,
  warnings jsonb not null default '[]'::jsonb,
  duplicate_of uuid references public.fuel_receipts (id),
  duplicate_override boolean not null default false,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipts_gallons_chk check (gallons is null or gallons > 0),
  constraint receipts_total_chk check (total_amount is null or total_amount > 0),
  constraint receipts_region_chk check (
    merchant_region is null or char_length(merchant_region) = 2
  ),
  constraint receipts_last4_chk check (
    payment_last4 is null or payment_last4 ~ '^[0-9]{4}$'
  ),
  constraint receipts_tank_combo_chk check (
    (tank_level_after_mode in ('unknown', 'full') and tank_level_after_value is null)
    or (tank_level_after_mode = 'percent' and tank_level_after_value between 0 and 100)
    or (tank_level_after_mode = 'gallons' and tank_level_after_value >= 0)
  ),
  unique (organization_id, client_receipt_uuid)
);

comment on column public.fuel_receipts.merchant_region is
  'Purchase jurisdiction (two-letter state/province). Used for IFTA-ready fuel purchase worksheets.';
comment on column public.fuel_receipts.original_image_path is
  'Private storage path for the untouched original. Never overwrite.';
comment on column public.fuel_receipts.payment_last4 is
  'Last four card digits only. Never store a full card number.';

create index if not exists fuel_receipts_org_truck_idx
  on public.fuel_receipts (organization_id, truck_id, purchased_at desc);
create index if not exists fuel_receipts_status_idx
  on public.fuel_receipts (organization_id, status);
create index if not exists fuel_receipts_sha_idx
  on public.fuel_receipts (organization_id, original_sha256);
create index if not exists fuel_receipts_signature_idx
  on public.fuel_receipts (organization_id, receipt_signature);

create table if not exists public.receipt_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  receipt_id uuid not null references public.fuel_receipts (id) on delete restrict,
  actor_id uuid references public.profiles (id),
  event_type public.receipt_audit_event_type not null,
  field_changes jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists receipt_audit_receipt_idx
  on public.receipt_audit_events (receipt_id, created_at);

create table if not exists public.fuel_level_estimates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  truck_id uuid not null references public.trucks (id) on delete restrict,
  receipt_id uuid references public.fuel_receipts (id),
  estimated_before_gallons numeric(10,2),
  purchased_gallons numeric(10,3),
  estimated_after_gallons numeric(10,2),
  odometer numeric(12,1),
  confidence public.estimate_confidence not null default 'unknown',
  method public.estimate_method not null default 'unknown',
  calculated_at timestamptz not null default now(),
  calculation_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fuel_level_estimates_truck_idx
  on public.fuel_level_estimates (truck_id, calculated_at desc);

create table if not exists public.fuel_stations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  external_provider text,
  external_id text,
  name text not null,
  address text,
  city text,
  region text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  truck_access public.yes_no_unknown not null default 'unknown',
  truck_lanes integer,
  parking_available public.yes_no_unknown not null default 'unknown',
  parking_verified_at timestamptz,
  trailer_policy public.trailer_policy not null default 'unknown',
  drop_location_name text,
  drop_location_address text,
  drop_location_latitude numeric(9,6),
  drop_location_longitude numeric(9,6),
  drop_location_verified_at timestamptz,
  manager_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fuel_stations_org_idx on public.fuel_stations (organization_id);

create table if not exists public.fuel_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  station_id uuid not null references public.fuel_stations (id) on delete cascade,
  fuel_type text not null default 'diesel',
  cash_price numeric(10,4),
  credit_price numeric(10,4),
  discounted_price numeric(10,4),
  observed_at timestamptz not null,
  source public.price_source not null,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fuel_price_snapshots_station_idx
  on public.fuel_price_snapshots (station_id, observed_at desc);

create table if not exists public.route_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  truck_id uuid not null references public.trucks (id) on delete restrict,
  driver_id uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  origin_text text not null,
  origin_latitude numeric(9,6),
  origin_longitude numeric(9,6),
  destination_text text not null,
  destination_latitude numeric(9,6),
  destination_longitude numeric(9,6),
  departure_at timestamptz,
  route_distance_miles numeric(10,2),
  route_duration_minutes integer,
  route_geometry jsonb,
  current_estimated_gallons numeric(10,2),
  recommended_station_id uuid references public.fuel_stations (id),
  recommended_purchase_gallons numeric(10,2),
  recommendation_explanation jsonb,
  trailer_attached boolean not null default true,
  status public.route_plan_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.route_stop_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  route_plan_id uuid not null references public.route_plans (id) on delete cascade,
  station_id uuid references public.fuel_stations (id),
  rank integer,
  route_mile numeric(10,2),
  detour_miles numeric(10,2),
  detour_minutes integer,
  displayed_price numeric(10,4),
  effective_trip_cost numeric(12,2),
  truck_access public.yes_no_unknown,
  trailer_decision text,
  parking_verified boolean,
  gallons_recommended numeric(10,2),
  excluded boolean not null default false,
  exclusion_reason text,
  explanation text,
  assumptions jsonb,
  calculation_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  uploaded_by uuid references public.profiles (id),
  source_filename text not null,
  status public.import_job_status not null default 'pending',
  row_count integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  actor_id uuid references public.profiles (id),
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_bucket_idx
  on public.rate_limit_events (bucket, user_id, created_at desc);

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trucks_set_updated_at before update on public.trucks
  for each row execute function public.set_updated_at();
create trigger assignments_set_updated_at before update on public.driver_truck_assignments
  for each row execute function public.set_updated_at();
create trigger receipts_set_updated_at before update on public.fuel_receipts
  for each row execute function public.set_updated_at();
create trigger stations_set_updated_at before update on public.fuel_stations
  for each row execute function public.set_updated_at();
create trigger prices_set_updated_at before update on public.fuel_price_snapshots
  for each row execute function public.set_updated_at();
create trigger route_plans_set_updated_at before update on public.route_plans
  for each row execute function public.set_updated_at();
