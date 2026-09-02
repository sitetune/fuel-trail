alter table public.organizations
  add column if not exists plan_id text,
  add column if not exists billing_interval text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_status text not null default 'none';

alter table public.organizations
  drop constraint if exists organizations_plan_id_chk;
alter table public.organizations
  add constraint organizations_plan_id_chk
  check (plan_id is null or plan_id in ('starter', 'growth', 'fleet', 'enterprise'));

alter table public.organizations
  drop constraint if exists organizations_billing_interval_chk;
alter table public.organizations
  add constraint organizations_billing_interval_chk
  check (billing_interval is null or billing_interval in ('month', 'year'));

alter table public.organizations
  drop constraint if exists organizations_billing_status_chk;
alter table public.organizations
  add constraint organizations_billing_status_chk
  check (billing_status in ('none', 'pending', 'active', 'past_due', 'canceled', 'unpaid'));

update public.organizations
set
  plan_id = coalesce(plan_id, 'fleet'),
  billing_status = case when status = 'active' then 'active' else billing_status end
where status = 'active' and plan_id is null;

grant update on public.organizations to authenticated;

drop policy if exists org_update_manager on public.organizations;
create policy org_update_manager on public.organizations
  for update to authenticated
  using (public.is_manager(id))
  with check (public.is_manager(id) and retention_years >= 4);
