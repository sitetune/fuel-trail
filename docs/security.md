# Security

## Roles

- `owner_admin`: organization settings, invites, deactivation
- `manager`: trucks, receipts, reports, prices, routes
- `driver`: own profile, assigned truck, own receipts, issued fuel-stop recommendations

Deactivated profiles (`is_active = false`) cannot use the app even with a valid session.

## RLS

Every exposed table has RLS enabled. Policies are organization-scoped. Drivers cannot select another driver's receipts. Guessing a UUID from another organization returns no row.

Audit tables (`receipt_audit_events`, `app_audit_events`) allow insert/select according to role and have **no update/delete policies**.

## Storage

Bucket `fuel-receipts` is private. Object path:

```text
{organization_id}/{truck_id}/{YYYY}/{MM}/{receipt_id}/original-{uuid}.{ext}
```

Originals have no update/delete Storage policies. Signed URLs are minted after authorization and expire in 60 seconds. Receipt images are not written to application logs.

## Service role

`SUPABASE_SERVICE_ROLE_KEY` is imported only via `src/lib/supabase/admin.ts` (`server-only`). Never send it to the browser, screenshots, or git.

## Threat notes

- Cross-org IDOR is denied by RLS plus server session checks.
- Duplicate submissions use client UUID + SHA-256 for idempotency.
- Rate limits on OCR, routing, and invites are database-backed. In production, add a shared store (Redis/Upstash) if you run multiple instances.
