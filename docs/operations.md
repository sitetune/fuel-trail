# Operations

## Failed OCR

The original remains in private storage. Status becomes `needs_review`. Drivers enter fields from the photo. Check Mindee status and `RECEIPT_OCR_PROVIDER`.

## Stuck offline uploads

The queue is IndexedDB namespaced by user id. Open **Waiting to upload** and tap **Retry**. Closing the tab does not delete the queue. Signing in as another user hides the previous user's items. Warn before sign-out if unsynced receipts exist. iOS will not reliably sync in the background.

## Duplicate review

Exact duplicate: same `original_sha256`. Likely duplicate: normalized signature of org, truck, date, merchant, gallons, total. Managers verify, reject, or override. Drivers cannot hard-delete submitted receipts.

## User deactivation

Owner-only. The last active owner cannot be deactivated. Deactivated users are blocked in session loading.

## Backup / export

- Truck fuel CSV: `/api/reports/fuel.csv`
- IFTA-ready fuel CSV: `/api/reports/ifta-fuel.csv`
- Use Supabase backups for Postgres + Storage
- Retention cannot drop below four years

## Production smoke tests

Use a real driver phone: capture, airplane-mode queue, retry, manager verify, CSV download, and confirm the image is a signed URL (not a public bucket).
