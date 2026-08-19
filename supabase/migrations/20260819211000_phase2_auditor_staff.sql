-- Phase 2: auditor read access, saved import mappings.

create or replace function public.is_org_staff(_org_id uuid)
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
      and role in ('owner_admin', 'manager', 'auditor')
  )
$$;

revoke all on function public.is_org_staff(uuid) from public;
grant execute on function public.is_org_staff(uuid) to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_org_staff(organization_id) or id = auth.uid())
  );

drop policy if exists trucks_select on public.trucks;
create policy trucks_select on public.trucks
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_org_staff(organization_id) or id = public.driver_active_truck_id())
  );

drop policy if exists assignments_select on public.driver_truck_assignments;
create policy assignments_select on public.driver_truck_assignments
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_org_staff(organization_id) or driver_id = auth.uid())
  );

drop policy if exists receipts_select on public.fuel_receipts;
create policy receipts_select on public.fuel_receipts
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_org_staff(organization_id) or driver_id = auth.uid())
  );

drop policy if exists receipt_audit_select on public.receipt_audit_events;
create policy receipt_audit_select on public.receipt_audit_events
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_org_staff(organization_id)
      or exists (
        select 1 from public.fuel_receipts r
        where r.id = receipt_id and r.driver_id = auth.uid()
      )
    )
  );

drop policy if exists estimates_select on public.fuel_level_estimates;
create policy estimates_select on public.fuel_level_estimates
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_org_staff(organization_id) or truck_id = public.driver_active_truck_id())
  );

drop policy if exists routes_select on public.route_plans;
create policy routes_select on public.route_plans
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_org_staff(organization_id)
      or (driver_id = auth.uid() and status = 'issued')
    )
  );

drop policy if exists route_stops_select on public.route_stop_candidates;
create policy route_stops_select on public.route_stop_candidates
  for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (
      public.is_org_staff(organization_id)
      or exists (
        select 1 from public.route_plans p
        where p.id = route_plan_id and p.driver_id = auth.uid() and p.status = 'issued'
      )
    )
  );

drop policy if exists app_audit_select on public.app_audit_events;
create policy app_audit_select on public.app_audit_events
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists fuel_receipts_storage_select on storage.objects;
create policy fuel_receipts_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fuel-receipts'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (
      public.is_org_staff(public.current_org_id())
      or (storage.foldername(name))[2] = public.driver_active_truck_id()::text
    )
  );

drop policy if exists import_jobs_staff_select on public.import_jobs;
create policy import_jobs_staff_select on public.import_jobs
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists report_runs_staff_select on public.report_runs;
create policy report_runs_staff_select on public.report_runs
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists report_run_receipts_staff_select on public.report_run_receipts;
create policy report_run_receipts_staff_select on public.report_run_receipts
  for select to authenticated
  using (
    exists (
      select 1 from public.report_runs r
      where r.id = report_run_id and public.is_org_staff(r.organization_id)
    )
  );

create table if not exists public.import_column_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null,
  name text not null,
  mapping jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (organization_id, kind, name)
);

alter table public.import_column_mappings enable row level security;
grant select, insert, update, delete on public.import_column_mappings to authenticated;

drop policy if exists import_mappings_select on public.import_column_mappings;
create policy import_mappings_select on public.import_column_mappings
  for select to authenticated
  using (public.is_org_staff(organization_id));

drop policy if exists import_mappings_write on public.import_column_mappings;
create policy import_mappings_write on public.import_column_mappings
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));
