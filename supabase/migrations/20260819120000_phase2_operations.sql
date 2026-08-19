-- Phase 2: notifications, report snapshots, fleet import metadata, display/amendment fields.

alter table public.fuel_receipts
  add column if not exists amended_at timestamptz;

alter table public.trucks
  add column if not exists notes text,
  add column if not exists fuel_type text not null default 'diesel';

alter table public.organizations
  add column if not exists default_fuel_type text not null default 'diesel',
  add column if not exists address text,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_email text;

alter table public.import_jobs
  add column if not exists kind text not null default 'fuel_prices',
  add column if not exists mapping jsonb,
  add column if not exists preview jsonb not null default '[]'::jsonb;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  href text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  email_status text not null default 'skipped',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email_events jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  created_by uuid references public.profiles (id),
  report_type text not null,
  filters jsonb not null default '{}'::jsonb,
  receipt_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.report_run_receipts (
  report_run_id uuid not null references public.report_runs (id) on delete cascade,
  receipt_id uuid not null references public.fuel_receipts (id) on delete restrict,
  snapshot jsonb not null default '{}'::jsonb,
  primary key (report_run_id, receipt_id)
);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.report_runs enable row level security;
alter table public.report_run_receipts enable row level security;

grant select, insert, update on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert on public.report_runs to authenticated;
grant select, insert on public.report_run_receipts to authenticated;

create policy notifications_select on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid() or public.is_manager(organization_id));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy notification_prefs_own on public.notification_preferences
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy report_runs_manager on public.report_runs
  for all to authenticated
  using (public.is_manager(organization_id))
  with check (public.is_manager(organization_id));

create policy report_run_receipts_manager on public.report_run_receipts
  for all to authenticated
  using (
    exists (
      select 1 from public.report_runs r
      where r.id = report_run_id and public.is_manager(r.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.report_runs r
      where r.id = report_run_id and public.is_manager(r.organization_id)
    )
  );
