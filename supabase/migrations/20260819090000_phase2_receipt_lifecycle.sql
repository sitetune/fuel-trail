-- Phase 2: receipt lifecycle fields, image versions, and driver resubmit RLS.

alter type public.receipt_audit_event_type add value if not exists 'resubmitted';
alter type public.receipt_audit_event_type add value if not exists 'image_replaced';

alter table public.fuel_receipts
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references public.profiles (id),
  add column if not exists manager_note text,
  add column if not exists other_purchases_amount numeric(12,2),
  add column if not exists replaces_receipt_id uuid references public.fuel_receipts (id),
  add column if not exists superseded_by uuid references public.fuel_receipts (id),
  add column if not exists version integer not null default 1,
  add column if not exists prior_original_paths jsonb not null default '[]'::jsonb,
  add column if not exists last_reported_at timestamptz,
  add column if not exists pending_original_path text;

comment on column public.fuel_receipts.rejected_at is
  'When a manager rejected this receipt. Drivers must correct or replace and resubmit.';
comment on column public.fuel_receipts.prior_original_paths is
  'Previous original image paths kept after a replacement. Never delete those objects.';
comment on column public.fuel_receipts.last_reported_at is
  'Set when this receipt is included in a generated report snapshot.';

drop policy if exists receipts_update_driver_draft on public.fuel_receipts;
create policy receipts_update_driver_draft on public.fuel_receipts
  for update to authenticated
  using (
    driver_id = auth.uid()
    and status in ('draft', 'processing', 'needs_review', 'rejected')
  )
  with check (
    driver_id = auth.uid()
    and organization_id = public.current_org_id()
    and truck_id = public.driver_active_truck_id()
    and status in ('draft', 'processing', 'needs_review', 'submitted', 'rejected')
  );
