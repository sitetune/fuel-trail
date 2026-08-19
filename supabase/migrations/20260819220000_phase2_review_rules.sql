-- Phase 2: organization receipt review rules.

alter table public.organizations
  add column if not exists review_rules jsonb not null default '{}'::jsonb;
