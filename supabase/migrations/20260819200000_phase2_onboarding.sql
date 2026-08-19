-- Phase 2: organization onboarding, status, and audited support access.

alter table public.organizations
  add column if not exists status text not null default 'active',
  add column if not exists logo_path text,
  add column if not exists onboarded_at timestamptz;

alter table public.organizations
  drop constraint if exists organizations_status_chk;
alter table public.organizations
  add constraint organizations_status_chk
  check (status in ('pending_activation', 'active', 'deactivated'));

create table if not exists public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  actor_email text not null,
  reason text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.support_access_grants enable row level security;
grant select, insert on public.support_access_grants to authenticated;

create policy support_access_owner_select on public.support_access_grants
  for select to authenticated
  using (public.is_owner_admin(organization_id));
