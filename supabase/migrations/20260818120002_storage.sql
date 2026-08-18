-- Private receipt bucket. Original objects are immutable (no update/delete policies).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fuel-receipts',
  'fuel-receipts',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users do not get direct storage listing. Signed URLs are minted
-- by authorized server routes after checking receipt access.

create policy fuel_receipts_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fuel-receipts'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (
      public.is_manager(public.current_org_id())
      or (storage.foldername(name))[2] = public.driver_active_truck_id()::text
    )
  );

create policy fuel_receipts_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'fuel-receipts'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and (
      public.is_manager(public.current_org_id())
      or (storage.foldername(name))[2] = public.driver_active_truck_id()::text
    )
  );

-- Intentionally no update or delete policies: originals cannot be overwritten or removed via the app.
