-- Deterministic local seed. Auth users are created by scripts/bootstrap-first-owner.ts
-- and scripts/seed-demo.ts. This file is safe to run on an empty database.

insert into public.organizations (
  id, name, slug, base_jurisdiction, timezone, currency,
  default_cost_per_mile, default_driver_time_value_hourly
) values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Gulf Coast Haul',
  'gulf-coast-haul',
  'TX',
  'America/Chicago',
  'USD',
  1.45,
  28
) on conflict (id) do nothing;

insert into public.trucks (
  id, organization_id, unit_number, vin, tank_capacity_gallons, target_mpg,
  week_start_min_gallons, reserve_gallons, status, baseline_fuel_gallons, baseline_odometer, baseline_recorded_at
) values
  ('11111111-1111-4111-8111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '101', '1FTDEMO0000000101', 200, 6.5, 100, 25, 'active', 140, 184000, '2026-06-01T12:00:00Z'),
  ('22222222-2222-4222-8222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '202', '1FTDEMO0000000202', 200, 6.4, 100, 25, 'active', 90, 210400, '2026-06-02T12:00:00Z'),
  ('33333333-3333-4333-8333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '303', '1FTDEMO0000000303', 200, 6.6, 100, 25, 'active', 160, 99000, '2026-06-03T12:00:00Z')
on conflict (id) do nothing;

insert into public.fuel_stations (
  id, organization_id, name, address, city, region, postal_code, latitude, longitude,
  truck_access, parking_available, parking_verified_at, trailer_policy, drop_location_verified_at, manager_notes
) values
  ('aaaa1111-1111-4111-8111-111111111111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pilot Travel Center Baytown', '550 Interstate 10', 'Baytown', 'TX', '77521', 29.7355, -94.9774, 'yes', 'yes', '2026-05-01T00:00:00Z', 'stay_attached', null, 'Verified truck parking.'),
  ('aaaa2222-2222-4222-8222-222222222222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Love''s Travel Stop Humble', '19711 US-59', 'Humble', 'TX', '77338', 30.0005, -95.2669, 'yes', 'yes', '2026-05-02T00:00:00Z', 'stay_attached', null, null),
  ('aaaa3333-3333-4333-8333-333333333333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Neighborhood Fuel Houston', '100 Main St', 'Houston', 'TX', '77002', 29.7604, -95.3698, 'no', 'no', null, 'unknown', null, 'Car-only. Exclude from truck routing.'),
  ('aaaa4444-4444-4444-8444-444444444444', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Conroe Drop Yard', '200 Industrial Rd', 'Conroe', 'TX', '77301', 30.3119, -95.4561, 'yes', 'yes', null, 'drop_required', null, 'Drop required. Parking not verified — exclude by default.')
on conflict (id) do nothing;

insert into public.fuel_price_snapshots (
  organization_id, station_id, fuel_type, cash_price, credit_price, observed_at, source
) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'aaaa1111-1111-4111-8111-111111111111', 'diesel', 3.459, 3.499, '2026-08-01T12:00:00Z', 'manager'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'aaaa2222-2222-4222-8222-222222222222', 'diesel', 3.529, 3.569, '2026-08-01T12:00:00Z', 'csv_import'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'aaaa3333-3333-4333-8333-333333333333', 'diesel', 3.199, 3.199, '2026-08-01T12:00:00Z', 'manager'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'aaaa4444-4444-4444-8444-444444444444', 'diesel', 3.399, 3.449, '2026-08-01T12:00:00Z', 'manager');
