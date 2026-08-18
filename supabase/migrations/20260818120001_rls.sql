-- Row Level Security. Helper functions use security definer only to read the
-- caller's profile (RLS would otherwise recurse). Search path is pinned.

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.current_profile()
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.current_profile()
$$;

create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = _org_id
      and is_active = true
  )
$$;

create or replace function public.is_manager(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = _org_id
      and is_active = true
      and role in ('owner_admin', 'manager')
  )
$$;

create or replace function public.is_owner_admin(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = _org_id
      and is_active = true
      and role = 'owner_admin'
  )
$$;

create or replace function public.driver_active_truck_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select truck_id
  from public.driver_truck_assignments
  where driver_id = auth.uid()
    and ends_at is null
  limit 1
$$;

revoke all on function public.current_profile() from public;
revoke all on function public.current_org_id() from public;
revoke all on function public.current_role() from public;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_manager(uuid) from public;
revoke all on function public.is_owner_admin(uuid) from public;
revoke all on function public.driver_active_truck_id() from public;

grant execute on function public.current_profile() to authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_manager(uuid) to authenticated;
grant execute on function public.is_owner_admin(uuid) to authenticated;
grant execute on function public.driver_active_truck_id() to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.trucks enable row level security;
alter table public.driver_truck_assignments enable row level security;
alter table public.fuel_receipts enable row level security;
alter table public.receipt_audit_events enable row level security;
alter table public.fuel_level_estimates enable row level security;
alter table public.fuel_stations enable row level security;
alter table public.fuel_price_snapshots enable row level security;
alter table public.route_plans enable row level security;
alter table public.route_stop_candidates enable row level security;
alter table public.import_jobs enable row level security;
alter table public.app_audit_events enable row level security;
alter table public.rate_limit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated, anon;

grant select on public.organizations to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.trucks to authenticated;
grant select, insert, update on public.driver_truck_assignments to authenticated;
grant select, insert, update on public.fuel_receipts to authenticated;
grant select, insert on public.receipt_audit_events to authenticated;
grant select, insert on public.fuel_level_estimates to authenticated;
grant select, insert, update on public.fuel_stations to authenticated;
grant select, insert, update on public.fuel_price_snapshots to authenticated;
grant select, insert, update on public.route_plans to authenticated;
grant select, insert on public.route_stop_candidates to authenticated;
grant select, insert, update on public.import_jobs to authenticated;
grant select, insert on public.app_audit_events to authenticated;
grant select, insert on public.rate_limit_events to authenticated;

-- organizations
create policy org_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

create policy org_update_owner on public.organizations
  for update to authenticated
  using (public.is_owner_admin(id))
  with check (public.is_owner_admin(id) and retention_years >= 4);

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or id = auth.uid()
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and organization_id = public.current_org_id() and role = public.current_role());

create policy profiles_update_owner on public.profiles
  for update to authenticated
  using (public.is_owner_admin(organization_id))
  with check (public.is_owner_admin(organization_id));

-- trucks
create policy trucks_select on public.trucks
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or id = public.driver_active_truck_id()
    )
  );

create policy trucks_write_manager on public.trucks
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

-- assignments
create policy assignments_select on public.driver_truck_assignments
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or driver_id = auth.uid()
    )
  );

create policy assignments_write_manager on public.driver_truck_assignments
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

-- receipts
create policy receipts_select on public.fuel_receipts
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or driver_id = auth.uid()
    )
  );

create policy receipts_insert_driver on public.fuel_receipts
  for insert to authenticated
  with check (
    organization_id = public.current_org_id()
    and driver_id = auth.uid()
    and truck_id = public.driver_active_truck_id()
    and status in ('draft', 'processing', 'needs_review')
  );

create policy receipts_insert_manager on public.fuel_receipts
  for insert to authenticated
  with check (public.is_manager(organization_id));

create policy receipts_update_driver_draft on public.fuel_receipts
  for update to authenticated
  using (
    driver_id = auth.uid()
    and status in ('draft', 'processing', 'needs_review')
  )
  with check (
    driver_id = auth.uid()
    and organization_id = public.current_org_id()
    and truck_id = public.driver_active_truck_id()
  );

create policy receipts_update_manager on public.fuel_receipts
  for update to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

-- No delete policy on fuel_receipts: hard delete is not available in the app.

-- receipt audit: insert + select, no update/delete
create policy receipt_audit_select on public.receipt_audit_events
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or exists (
        select 1 from public.fuel_receipts r
        where r.id = receipt_id and r.driver_id = auth.uid()
      )
    )
  );

create policy receipt_audit_insert on public.receipt_audit_events
  for insert to authenticated
  with check (organization_id = public.current_org_id());

-- estimates
create policy estimates_select on public.fuel_level_estimates
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or truck_id = public.driver_active_truck_id()
    )
  );

create policy estimates_insert on public.fuel_level_estimates
  for insert to authenticated
  with check (organization_id = public.current_org_id());

-- stations / prices
create policy stations_select on public.fuel_stations
  for select to authenticated
  using (organization_id = public.current_org_id() or organization_id is null);

create policy stations_write_manager on public.fuel_stations
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

create policy prices_select on public.fuel_price_snapshots
  for select to authenticated
  using (organization_id = public.current_org_id());

create policy prices_write_manager on public.fuel_price_snapshots
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

-- routes
create policy routes_select on public.route_plans
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or (driver_id = auth.uid() and status = 'issued')
    )
  );

create policy routes_write_manager on public.route_plans
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

create policy route_stops_select on public.route_stop_candidates
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_manager(organization_id)
      or exists (
        select 1 from public.route_plans p
        where p.id = route_plan_id and p.driver_id = auth.uid() and p.status = 'issued'
      )
    )
  );

create policy route_stops_insert_manager on public.route_stop_candidates
  for insert to authenticated
  with check (public.is_manager(organization_id));

-- imports
create policy imports_manager on public.import_jobs
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

-- app audit
create policy app_audit_select on public.app_audit_events
  for select to authenticated
  using (public.is_manager(organization_id));

create policy app_audit_insert on public.app_audit_events
  for insert to authenticated
  with check (organization_id = public.current_org_id());

-- rate limits: users insert their own; no client update/delete
create policy rate_limit_insert on public.rate_limit_events
  for insert to authenticated
  with check (user_id = auth.uid());

create policy rate_limit_select on public.rate_limit_events
  for select to authenticated
  using (user_id = auth.uid() or public.is_manager(organization_id));
