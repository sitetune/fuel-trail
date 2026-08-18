# FuelTrail — Cursor MVP Build Brief

> Working name: **FuelTrail**  
> Tagline: **Every gallon. Every truck. One clear trail.**

This is the master build instruction for Cursor Agent. Read the entire document before changing files. Build the application in phases, but do not stop at a wireframe or static prototype. The finished MVP must use real Supabase authentication, database records, private receipt storage, OCR processing, role permissions, reports, calculations, tests, and a production-ready Vercel build.

## 1. Product summary

Build a mobile-first fleet fuel-management web app for a small trucking company. Drivers use their phones to photograph fuel receipts immediately after buying diesel. The app stores the untouched receipt image, extracts relevant fields, requires the driver to verify the extracted values, and saves a permanent structured record tied to the correct truck.

Managers get a more detailed dashboard centered on trucks—not drivers—with fuel spending, gallons, estimated tank levels, missing or questionable receipts, month-to-month trends, IFTA-ready fuel purchase exports, savings opportunities, and fuel-stop planning.

This is a responsive Progressive Web App (PWA), not a native iOS or Android app. It must feel app-like when opened from a phone and be installable to the home screen.

## 2. Non-negotiable product rules

1. Every fuel transaction belongs to an organization, a truck, and a driver.
2. Every report defaults to grouping **by truck**. Driver is a secondary filter only.
3. The original receipt image must be retained in private storage and never overwritten.
4. OCR is an assistant, not the source of truth. A driver must review and confirm extracted values before final submission.
5. Never claim the estimated fuel gauge is a live sensor reading. Label it **Estimated fuel** and show the calculation timestamp/confidence.
6. Never call the MVP a complete IFTA filing product. It creates IFTA-ready fuel-purchase records and exports. Complete IFTA calculation also requires distance by jurisdiction.
7. Do not scrape GasBuddy, Walmart, Trucker Path, Mudflap, Fuelbook, or another consumer app. Use only documented APIs or manager-entered/imported data.
8. Do not recommend dropping a trailer unless a manager has marked a parking/drop location as verified. If parking is not verified, exclude that stop by default and display a safety warning.
9. No hard delete for submitted receipts in the user interface. Corrections must be auditable.
10. The Supabase service-role key is server-only and must never appear in browser code, logs, screenshots, or Git.

## 3. MVP boundary

### Required in this MVP

- Supabase email authentication and invite flow.
- Roles: `owner_admin`, `manager`, and `driver`.
- Admin creates/invites users, assigns roles, activates/deactivates users, and assigns drivers to trucks.
- Truck management, including unit number, optional VIN/license plate, tank capacity, target MPG, minimum Monday fuel, reserve fuel, and status.
- Very simple driver home screen.
- Phone camera receipt capture plus gallery/file fallback.
- Receipt image preview, retake, compression for upload, and preservation of the untouched original.
- Private Supabase Storage bucket.
- Server-side receipt OCR through a provider interface.
- A working Mindee receipt provider when `MINDEE_API_KEY` is configured, plus a manual provider so local development and production remain usable without OCR credentials.
- One-screen driver review form populated by OCR.
- Submission validation, duplicate warnings, OCR confidence indicators, and an audit trail.
- Manager receipt inbox with pending, verified, needs-review, rejected, and duplicate-warning states.
- Truck-first dashboard and truck detail pages.
- Estimated fuel gauge per truck.
- Month-over-month fuel spend, gallons, average price, cost per mile where mileage exists, and trend explanations.
- IFTA-ready fuel purchase report grouped by truck and purchase jurisdiction, with CSV export.
- Savings Finder based on available company receipts, manager-entered prices, imported price snapshots, and optional provider data.
- Fuel-stop planner with manual-price mode and a documented provider adapter for live routing/fuel data.
- CSV import for station/fuel-price snapshots so the planning feature works without a commercial API contract.
- Mobile offline capture queue using IndexedDB. If the network is unavailable, preserve the image and draft locally, clearly show `Waiting to upload`, and retry when the app is online. Do not promise background sync on iOS; include a visible Retry button.
- Responsive, accessible UI; lint, types, tests, and a passing production build.
- GitHub Actions CI and Vercel deployment documentation.

### Explicitly deferred

- Actual tax filing or remittance.
- Automatic mileage-by-jurisdiction from ELD/GPS.
- Fuel-card payment processing.
- Telematics/live tank sensors.
- Native mobile apps.
- Driver payroll, dispatch, load management, maintenance, or full TMS features.
- Push/SMS notifications.
- Automatic vendor contracts for live fuel pricing.

Design extension points for those capabilities, but do not let them delay the MVP.

## 4. Recommended technical stack

Use the latest stable versions that are mutually compatible at the time of implementation. Record the installed versions in `README.md` and commit the lockfile.

- Next.js App Router with TypeScript and strict mode.
- React Server Components by default; Client Components only where browser interactivity requires them.
- Tailwind CSS and shadcn/ui.
- Supabase Postgres, Auth, and Storage.
- `@supabase/ssr` for cookie-based server authentication.
- Zod for all server/client boundary validation.
- React Hook Form for review and admin forms.
- Recharts for manager charts.
- TanStack Table for receipt/report grids if needed.
- `idb` for the offline upload queue.
- `browser-image-compression` or an equivalent maintained client utility for the upload copy. Keep the original file unchanged.
- Vitest for units, React Testing Library for components, and Playwright for critical journeys.
- `pnpm` as package manager.

Do not add a large state library unless the app demonstrably needs it. Do not put privileged business logic only in the browser.

## 5. Project bootstrap

If the repository is empty:

```bash
pnpm create next-app@latest fueltrail --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

If the repository already contains a Next.js app, inspect it and adapt rather than recreating it. Never delete existing user work.

Create:

```text
src/
  app/
    (auth)/
    (driver)/driver/
    (management)/manage/
    api/
  components/
    driver/
    management/
    receipts/
    reports/
    fuel-planning/
    ui/
  lib/
    auth/
    supabase/
    calculations/
    ocr/
    routing/
    reports/
    offline/
    validation/
  types/
supabase/
  migrations/
  seed.sql
tests/
  e2e/
  fixtures/
public/
```

## 6. Branding and interface direction

Use the FuelTrail working brand throughout the MVP, isolated in `src/config/brand.ts` so it can be renamed without searching the codebase.

- Brand name: FuelTrail
- Tagline: Every gallon. Every truck. One clear trail.
- Visual character: trustworthy, rugged, operational, modern—not cartoon trucking art.
- Suggested palette:
  - deep navy `#0B1F33`
  - diesel amber `#F5A524`
  - road gray `#5E6B75`
  - success green `#198754`
  - alert red `#C93C37`
  - off-white `#F7F8FA`
- Use a simple wordmark with an abstract road/fuel-drop mark; keep it vector/CSS so the MVP does not depend on generated art.

Driver screens must use large touch targets (minimum 44×44 CSS pixels), readable type, high contrast, and one primary action per screen. Management screens may be denser, but must remain usable at 360, 390, 768, 1024, 1440, and 1920 CSS-pixel widths.

## 7. Users, organizations, and permissions

Even if the first deployment serves one company, make the data model organization-scoped to avoid a painful rewrite later.

Roles:

- `owner_admin`: full organization access; invites/deactivates users; changes organization settings.
- `manager`: manages trucks, assignments, receipts, reports, prices, routes, and verification; cannot change the owner or organization security settings.
- `driver`: sees only their own profile, current assigned truck, their own receipt drafts/submissions, and manager-issued fuel-stop recommendations.

Authentication requirements:

- Email/password sign-in and admin email invites through Supabase Auth.
- Password reset.
- Protected route groups with server-side role checks.
- Deactivated users are denied app access even if their Supabase session remains valid.
- Admin user creation/invitation happens only in a server action/route using the service-role client.
- Add a first-owner bootstrap script documented in the README. Never expose it as an unprotected production endpoint.

## 8. Database design

Create timestamped SQL migrations. Use UUID primary keys, `created_at`, and `updated_at` consistently. Use `numeric`, not floating-point, for money and gallons. Add foreign keys, checks, useful indexes, and comments for non-obvious fields.

### Core tables

#### `organizations`

- `id`
- `name`
- `slug`
- `base_jurisdiction` (two-letter state/province code, nullable until configured)
- `timezone` default `America/Chicago`
- `currency` default `USD`
- `default_tank_capacity_gallons` default `200`
- `default_target_mpg` default `6.5`
- `default_week_start_min_gallons` default `100`
- `default_reserve_gallons` default `25`
- `default_cost_per_mile` nullable
- `default_driver_time_value_hourly` nullable
- `retention_years` default `4`, check `>= 4`
- timestamps

#### `profiles`

- `id` references `auth.users(id)`
- `organization_id`
- `full_name`
- `email`
- `phone` nullable
- `role` enum/check: `owner_admin | manager | driver`
- `is_active` default true
- `last_seen_at` nullable
- timestamps

#### `trucks`

- `id`
- `organization_id`
- `unit_number` unique within organization
- `vin` nullable
- `license_plate` nullable
- `license_state` nullable
- `year`, `make`, `model` nullable
- `tank_capacity_gallons` default `200`
- `target_mpg`
- `week_start_min_gallons` default `100`
- `reserve_gallons` default `25`
- `status`: `active | maintenance | inactive`
- `baseline_fuel_gallons` nullable
- `baseline_odometer` nullable
- `baseline_recorded_at` nullable
- timestamps

#### `driver_truck_assignments`

- `id`
- `organization_id`
- `driver_id`
- `truck_id`
- `starts_at`
- `ends_at` nullable
- `created_by`
- timestamps

Prevent overlapping active assignments for the same driver. A truck may be assigned to only one active primary driver in the MVP. Preserve assignment history.

#### `fuel_receipts`

- `id`
- `organization_id`
- `truck_id`
- `driver_id`
- `assignment_id` nullable
- `status`: `draft | processing | needs_review | submitted | verified | rejected | archived`
- `purchased_at` timestamptz
- `purchase_timezone` nullable
- `merchant_name`
- `merchant_address`
- `merchant_city`
- `merchant_region` (state/province code; this is the purchase jurisdiction)
- `merchant_postal_code` nullable
- `merchant_latitude` nullable
- `merchant_longitude` nullable
- `receipt_number` nullable
- `purchaser_name`
- `fuel_type` default `diesel`
- `gallons` numeric(10,3)
- `price_per_gallon` numeric(10,4) nullable
- `subtotal_amount` numeric(12,2) nullable
- `tax_amount` numeric(12,2) nullable
- `total_amount` numeric(12,2)
- `odometer` numeric(12,1) nullable
- `payment_last4` nullable; never store a full card number
- `tank_level_after_mode`: `unknown | full | percent | gallons`
- `tank_level_after_value` nullable
- `trailer_attached` nullable
- `trailer_dropped` default false
- `trailer_parking_notes` nullable
- `original_image_path`
- `display_image_path` nullable
- `original_sha256`
- `receipt_signature` (normalized hash used for likely-duplicate detection)
- `ocr_provider`
- `ocr_provider_document_id` nullable
- `ocr_confidence` numeric(5,4) nullable
- `ocr_raw_json` jsonb nullable
- `ocr_extracted_json` jsonb nullable
- `submitted_at` nullable
- `verified_at` nullable
- `verified_by` nullable
- `rejection_reason` nullable
- `created_at`, `updated_at`

Add checks for positive gallons/amounts, plausible state codes, and valid tank-level combinations. Do not hard reject a purchase above tank capacity; warn and require a manager override because split tanks, reefer fuel, or OCR errors may explain it.

#### `receipt_audit_events`

- `id`
- `organization_id`
- `receipt_id`
- `actor_id`
- `event_type`: `captured | uploaded | ocr_completed | ocr_failed | field_corrected | submitted | verified | rejected | duplicate_overridden | archived`
- `field_changes` jsonb nullable containing before/after values
- `metadata` jsonb nullable
- `created_at`

Audit events are append-only. No client role may update or delete them.

#### `fuel_level_estimates`

- `id`
- `organization_id`
- `truck_id`
- `receipt_id` nullable
- `estimated_before_gallons` nullable
- `purchased_gallons` nullable
- `estimated_after_gallons` nullable
- `odometer`
- `confidence`: `high | medium | low | unknown`
- `method`: `driver_full | driver_percent | driver_gallons | odometer_model | baseline | unknown`
- `calculated_at`
- `calculation_json` jsonb

Preserve history instead of storing only the latest gauge.

#### `fuel_stations`

- `id`
- `organization_id` nullable for provider-sourced shared records
- `external_provider` nullable
- `external_id` nullable
- `name`
- address/city/region/postal code
- latitude/longitude
- `truck_access`: `yes | no | unknown`
- `truck_lanes` nullable
- `parking_available`: `yes | no | unknown`
- `parking_verified_at` nullable
- `trailer_policy`: `stay_attached | drop_required | unknown`
- `drop_location_name/address/latitude/longitude` nullable
- `drop_location_verified_at` nullable
- `manager_notes` nullable
- timestamps

#### `fuel_price_snapshots`

- `id`
- `organization_id`
- `station_id`
- `fuel_type`
- `cash_price` nullable
- `credit_price` nullable
- `discounted_price` nullable
- `observed_at`
- `source`: `manager | csv_import | receipt | provider`
- `source_reference` nullable
- timestamps

#### `route_plans`

- `id`
- `organization_id`
- `truck_id`
- `driver_id` nullable
- `created_by`
- origin/destination text and coordinates
- `departure_at` nullable
- `route_distance_miles`
- `route_duration_minutes`
- `route_geometry` jsonb nullable
- `current_estimated_gallons`
- `recommended_station_id` nullable
- `recommended_purchase_gallons` nullable
- `recommendation_explanation` jsonb nullable
- `status`: `draft | issued | accepted | completed | cancelled`
- timestamps

#### `route_stop_candidates`

Store every candidate and the inputs/results used to rank it, including route mile, detour miles/minutes, displayed price, effective trip cost, truck access, trailer decision, parking verification, gallons recommended, exclusion reason, and rank. This makes recommendations explainable later.

#### `import_jobs`

Track CSV price imports, row counts, errors, source filename, uploader, status, and created time.

#### `app_audit_events`

Append-only organization/user/truck/admin events that are not specific to a receipt.

### Views or database functions

Create SQL views/RPC functions where they simplify secure reporting:

- latest fuel estimate by truck
- monthly truck fuel metrics
- quarterly fuel purchases by truck and jurisdiction
- missing/needs-review receipt counts by truck
- station latest known price

All views/functions must remain organization-scoped and respect caller access. Do not use a `security definer` function unless necessary; if used, set a safe search path and perform explicit organization/role checks.

## 9. Row Level Security and storage security

Enable RLS on every exposed table in the migration. Revoke unnecessary grants before granting back the minimum required operations.

Policy intent:

- `owner_admin` and `manager` can read organization rows required for management.
- Drivers can read their organization, their own profile, current truck assignment/truck, their own receipts/audit history, and issued route plans.
- Drivers can create and update only their own draft/needs-review receipt records for their active assigned truck.
- After submission, drivers cannot change compliance fields; they may add an explanatory note through a controlled server action that writes an audit event.
- Managers verify/reject/archive receipts within their organization.
- No user can access another organization by changing a URL or UUID.
- Append-only audit tables allow insert through trusted server paths and select according to role, but no client update/delete.

Create a private Storage bucket named `fuel-receipts`.

Object path:

```text
{organization_id}/{truck_id}/{YYYY}/{MM}/{receipt_id}/original-{uuid}.{ext}
{organization_id}/{truck_id}/{YYYY}/{MM}/{receipt_id}/display-{uuid}.webp
```

Requirements:

- Original object is uploaded once and never overwritten.
- Generate short-lived signed URLs only after authorization.
- Store SHA-256 of the original bytes.
- Drivers can upload only into a server-generated path for their own draft.
- No public bucket URLs.
- No receipt image is included in application logs or third-party analytics.
- Add tests or documented SQL verification for cross-organization denial.

## 10. Receipt capture and OCR flow

### Driver journey

The logged-in driver home page should show:

- assigned truck unit number
- estimated tank gauge with `Estimated` label and last updated time
- one dominant `Scan fuel receipt` button
- current manager-issued fuel stop, if any
- offline queue count
- latest three receipts and their states

Capture flow:

1. Tap `Scan fuel receipt`.
2. Open the rear camera using `<input type="file" accept="image/*" capture="environment">`, with a normal upload fallback.
3. Preview image; offer Retake or Use Photo.
4. Create a local draft immediately. Calculate a SHA-256 hash in a Web Worker where available.
5. If offline, save the image Blob plus metadata in IndexedDB and return to an explicit queued state.
6. If online, upload through a server-authorized flow to private Storage.
7. Start server-side OCR and show a real processing state.
8. Present one review screen. Prefill all extracted values but highlight low-confidence/missing fields.
9. Driver confirms truck, purchase date/time, merchant, address/state, gallons, fuel type, price/total, purchaser name, odometer, and tank level after fueling.
10. Driver taps `Submit receipt` and sees a success confirmation with truck and gallons.

Do not require the driver to type fields that can be safely inferred from their profile/assignment, but always allow correction before submission.

### OCR provider interface

Create:

```ts
interface ReceiptOcrProvider {
  analyze(input: ReceiptOcrInput): Promise<NormalizedReceiptExtraction>;
}
```

Implement:

- `MindeeReceiptOcrProvider` using a server-only API key and the current official receipt endpoint/SDK.
- `ManualReceiptOcrProvider` that returns an empty normalized result with a clear manual-entry message.

Select with `RECEIPT_OCR_PROVIDER=mindee|manual`. If Mindee is selected but misconfigured, show a recoverable manual-entry state rather than losing the receipt.

Normalized extraction should include values and per-field confidence for merchant, date/time, address, region, receipt number, gallons, price per gallon, subtotal/tax/total, fuel type, and purchaser when available. Keep the provider's raw JSON server-side in `ocr_raw_json` for troubleshooting. Never trust a provider response without Zod validation.

Because general receipt APIs may not always understand trucking-specific fields such as gallons or unit number, inspect line items/raw text and present missing fields for manual confirmation. Never submit silently.

### Validation and duplicate detection

- Check `gallons × price_per_gallon` against total with a configurable tolerance; warn instead of blindly rejecting because tax/DEF/other items can affect totals.
- Derive price per gallon from total/gallons only when it is missing and mark it derived.
- Exact duplicate: same original SHA-256.
- Likely duplicate: normalized signature of organization, truck, purchase date, merchant, gallons, and total.
- A likely duplicate must show the possible matching receipt and require manager override.
- Flag future dates, implausible fuel prices, negative/zero values, odometer rollback, purchases above configured tank capacity, and submission more than 24 hours after purchase.

## 11. Estimated fuel gauge

This is a calculated estimate, not telematics.

Best available baseline order:

1. Driver says tank was full after fueling: set after-fuel gallons to truck capacity; high confidence.
2. Driver enters gallons remaining after fueling: use that value; high confidence.
3. Driver selects a percentage: capacity × percentage; medium confidence.
4. Previous estimate plus current receipt and odometer consumption model; medium/low confidence depending on age/data.
5. Manager baseline; medium confidence.
6. Otherwise unknown.

For the odometer model:

```text
miles_since_previous = max(0, current_odometer - previous_odometer)
estimated_used = miles_since_previous / target_mpg
estimated_before = clamp(previous_estimated_after - estimated_used, 0, capacity)
estimated_after = clamp(estimated_before + purchased_gallons, 0, capacity)
```

Never overwrite history. Save every calculation with inputs and method. If odometer is missing or rolled backward, lower confidence and show the reason.

Gauge display:

- gallons and percentage
- capacity
- high/medium/low/unknown confidence
- last updated time
- alert below reserve
- Monday/start-of-week alert below the truck's configured minimum (default 100 gallons)
- all recommended purchase quantities rounded up to the next 5-gallon increment and capped by available tank capacity

## 12. Management application

### `/manage` fleet dashboard

Show:

- active trucks
- total fuel spend this month
- gallons this month
- fleet average price per gallon
- month-over-month spend percentage
- cost per mile where mileage is available
- receipts needing review
- suspected duplicates
- trucks below reserve or below Monday minimum
- estimated savings opportunities

Primary table/cards must be by truck:

- unit number
- assigned driver
- estimated fuel gauge/confidence
- month spend
- gallons
- average price
- cost per mile if known
- latest receipt time
- flags

Do not label a month simply good or bad based only on total spend. Explain whether spend changed because of gallons, price, or miles. If mileage is unavailable, say so.

### `/manage/trucks/[truckId]`

- truck details/settings
- current assignment and history
- large estimated fuel gauge
- trend charts for spend, gallons, average price, and cost/mile
- receipt history
- price paid by station
- savings observations
- latest route plans
- baseline correction action with audit record

### `/manage/receipts`

- status tabs and filters for truck, driver, date, merchant, state, confidence, duplicate warning
- sortable table
- receipt detail drawer/page with image and structured fields side-by-side
- before/after correction history
- Verify, Reject with reason, Mark duplicate, and Override duplicate actions
- signed image URLs created on demand

### `/manage/users`

- invite user
- role
- assigned truck
- active/deactivated state
- resend invite/password reset
- prevent deactivating the last active owner

### `/manage/trucks`

- create/edit truck
- assign driver
- set capacity/MPG/minimum/reserve/baseline
- preserve prior assignment and baseline audit history

## 13. Reports

### Truck fuel report

Default report and export grouping is by truck. Filters:

- date range
- truck(s)
- driver(s)
- merchant
- purchase jurisdiction
- verification status

Metrics:

- gallons
- spend
- average price per gallon (weighted: total spend / gallons)
- receipt count
- miles, MPG, and cost/mile only when supported by mileage data
- month-over-month comparisons

### IFTA-ready fuel purchase worksheet

Group by:

1. quarter
2. truck/unit number
3. purchase jurisdiction
4. fuel type

Include gallons, tax-paid amount/total, receipt count, and a drill-down to receipts. CSV export must include at least:

- organization/carrier name
- unit number
- VIN if configured
- driver/purchaser
- purchase date/time
- seller name and address
- jurisdiction
- gallons
- fuel type
- price per gallon
- total
- receipt number
- verification status
- original receipt record ID

Display a permanent note: `Fuel purchase worksheet only. A complete IFTA return also requires distance traveled in each jurisdiction.`

CSV files must open cleanly in Excel, use ISO dates, and correctly escape commas/quotes. Add a printable report view, but CSV is the required audit-friendly output.

## 14. Savings Finder

The Savings Finder must use real stored inputs and expose its reasoning. Never fabricate a station price.

### Historical savings observations

For each verified purchase, compare the paid price against:

- the organization's weighted price that day/region
- the latest known prices at stations within the configured radius and time window
- that station's own recent history

Only show a dollar opportunity when comparable data exists. Otherwise show `Not enough comparison data`.

### Fuel-stop planner

Manager enters/selects:

- truck
- origin and destination
- current estimated fuel or manual override
- desired arrival reserve
- trailer attached yes/no
- optional departure time

Provider abstraction:

```ts
interface FuelRouteProvider {
  getTruckRoute(input: TruckRouteInput): Promise<TruckRoute>;
  findStationsAlongRoute(input: StationSearchInput): Promise<RouteStation[]>;
  getFuelPrices(input: FuelPriceInput): Promise<FuelPriceQuote[]>;
}
```

Implement two modes:

1. `manual`: required and fully functional. Manager can add candidate stations or import CSV snapshots.
2. `here`: feature-flagged adapter for HERE truck routing/station/fuel-price APIs when access and `HERE_API_KEY` are available. Use only current official endpoints. If the account lacks Fuel Prices access, preserve route/manual-price functionality and show a configuration notice.

Environment setting: `FUEL_ROUTE_PROVIDER=manual|here`.

Candidate ranking must calculate:

```text
effective_cost = gallons_to_buy × displayed_price
               + detour_miles × configured_cost_per_mile
               + (detour_minutes / 60) × driver_time_value_hourly
               + configured_trailer_drop_penalty
```

Also consider:

- whether the truck can reach the station and still retain reserve
- tank capacity
- purchase quantity rounded up to 5 gallons
- truck access
- trailer attached/drop requirement
- verified parking/drop location
- price freshness
- route detour

Default exclusions:

- `truck_access = no`
- drop required but no manager-verified drop/parking location
- stale or missing price when priced candidates exist
- cannot reach station without breaching reserve

Recommendation output must say why, for example:

`Stop at Station X near I-10 Exit 100. Buy 115 gallons. The pump price is 18¢/gal lower than the next truck-accessible option; after 3.2 detour miles, estimated net savings are $16.40. Trailer can remain attached.`

If the recommendation requires assumptions, list them. The driver makes the final safety decision.

### Fuel price CSV import

Provide downloadable template and import UI with:

- station name
- address/city/state/ZIP
- latitude/longitude (optional if manager resolves later)
- price
- fuel type
- observed timestamp
- truck access
- parking available
- trailer policy
- drop location/notes

Preview and validate rows before commit. Import valid rows and return row-level errors for invalid ones.

## 15. Offline behavior

Receipt capture must survive weak service.

- Save offline draft metadata and image Blob to IndexedDB.
- Encrypting browser storage is not reliably meaningful without key management; instead minimize local metadata and remove queued data after confirmed server submission.
- Show an obvious Offline badge.
- Retry automatically when the browser fires `online`, but keep a manual Retry control.
- Make retries idempotent using a client-generated receipt UUID and SHA-256.
- If the browser/tab closes, queued items must still be present on next open for that signed-in user.
- If another user signs in on the same device, do not show the prior user's queued receipt. Namespace local records by Supabase user ID and organization.
- Provide a warning before sign-out if unsynced receipts exist.

## 16. API routes/server actions

Use route handlers/server actions with explicit auth and Zod validation. Suggested boundaries:

- `/api/receipts/initiate`
- `/api/receipts/[id]/upload-complete`
- `/api/receipts/[id]/ocr`
- `/api/receipts/[id]/submit`
- `/api/receipts/[id]/verify`
- `/api/receipts/[id]/signed-image`
- `/api/admin/invite-user`
- `/api/reports/fuel.csv`
- `/api/reports/ifta-fuel.csv`
- `/api/imports/fuel-prices`
- `/api/routes/plan`

Do not return raw database errors to clients. Use a standard error envelope with safe messages and server-side correlation IDs. Redact secrets, receipt contents, and full signed URLs from logs.

Protect expensive OCR/route endpoints with per-user and per-organization rate limits. At minimum, implement database-backed request counters or a clean provider interface and a conservative in-memory development limiter; document the production recommendation.

## 17. Calculations

Put pure functions in `src/lib/calculations` and unit-test them thoroughly:

- weighted average price
- month-over-month absolute and percentage changes
- cost per mile
- MPG
- fuel estimate
- gallons rounded to next 5
- reachable distance with reserve
- recommended purchase gallons
- effective stop cost
- savings versus alternative
- quarter/date range boundaries in the organization timezone
- duplicate receipt signature normalization

Handle zero/unknown denominators explicitly. Never render `NaN`, `Infinity`, or a misleading `0` when the answer is unknown.

## 18. Seed/demo data

Provide a deterministic seed for local development:

- one organization
- one owner, one manager, and two driver profile placeholders documented for linking to auth users
- three trucks with 200-gallon capacity
- assignments
- at least 20 receipts across two months and multiple Texas jurisdictions/stations
- a few pending/low-confidence/duplicate-warning examples
- fuel estimates at different confidence levels
- station/price snapshots including truck-accessible, car-only, and drop-required examples
- one route plan resembling Baytown, TX to Conroe, TX

Never seed real credentials or real payment information.

## 19. Environment variables

Create `.env.example` with no secrets:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RECEIPT_OCR_PROVIDER=manual
MINDEE_API_KEY=
FUEL_ROUTE_PROVIDER=manual
HERE_API_KEY=
CRON_SECRET=
```

If current Supabase or provider documentation uses revised variable names, follow current official naming and update `.env.example` and README consistently.

## 20. Testing and Definition of Done

Do not present the work as complete until all blocking tests pass.

### Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Add `typecheck` if the scaffold does not create it.

### Required unit tests

- all calculations in Section 17
- timezone/quarter grouping
- receipt validation and derived price
- exact/likely duplicate detection
- OCR normalization with missing fields
- route candidate exclusions and ranking
- role helper logic

### Required end-to-end journeys

1. Driver signs in, captures/uploads a receipt fixture, reviews fields, submits, and sees success.
2. Driver goes offline, captures a receipt, reloads, returns online, retries, and submits without duplication.
3. Manager sees the submission under the correct truck, opens the image, corrects one field, and verifies it; audit history shows before/after.
4. A driver cannot open another driver's receipt or management routes.
5. A user from another organization cannot access a guessed receipt/truck UUID.
6. Admin invites a driver and assigns a truck.
7. Truck report defaults to truck grouping and exports correct totals.
8. IFTA-ready CSV groups gallons by truck and jurisdiction and shows the required limitation note.
9. Fuel gauge produces the expected estimate/confidence and never displays as a sensor reading.
10. Savings Finder excludes car-only and unverified trailer-drop stops.
11. Likely duplicate receipt requires manager review.

### Visual/responsive acceptance

Test complete journeys—not isolated screenshots—at:

- iPhone-sized 360×800 and 390×844
- tablet 768×1024
- desktop 1024×768, 1440×900, and 1920×1080

Verify:

- no horizontal overflow
- camera/upload and all dialogs can be dismissed on mobile
- dialogs fit and scroll within the viewport
- nav/menu opens, closes, and remains scrollable
- all controls have visible focus states
- forms do not jump in height when validation appears
- charts have accessible text summaries and usable mobile fallbacks
- tables become cards or horizontal scroll regions intentionally
- repeated actions do not create duplicates
- loading, empty, offline, error, and success states are present

### Security/compliance acceptance

- RLS enabled on every exposed table.
- Storage bucket private.
- Service key absent from client bundles and Git history.
- Signed receipt URLs short-lived.
- Cross-organization access denied.
- Submitted receipt originals immutable through the app.
- No hard-delete UI for compliance records.
- Audit events append-only.
- Original image hash recorded.
- Retention setting cannot be below four years.

## 21. CI, GitHub, and Vercel

Create `.github/workflows/ci.yml` that runs install with frozen lockfile, lint, typecheck, unit tests, and build on pull requests and pushes to the default branch. Run Playwright in CI if practical; otherwise provide a separate workflow and document its prerequisites.

README deployment steps:

1. Create Supabase project.
2. Configure Auth URLs for localhost and the Vercel production/preview domains.
3. Link Supabase CLI and run migrations.
4. Create/verify the private `fuel-receipts` bucket through migration/setup.
5. Bootstrap first owner.
6. Create Vercel project from the GitHub repository.
7. Add environment variables separately for Development, Preview, and Production.
8. Deploy.
9. Run production smoke tests.

Do not commit `.env*` secrets. If the Git remote is not configured, finish the local repository and provide the exact commands needed; do not invent a GitHub URL or push destination.

## 22. Documentation deliverables

The finished repository must include:

- `README.md` with setup, architecture, environment, migration, seed, OCR/manual modes, route/manual modes, testing, and Vercel deployment.
- `docs/product-scope.md` explaining MVP vs deferred features.
- `docs/data-retention-and-ifta.md` explaining receipt retention and the distinction between the fuel worksheet and full IFTA reporting.
- `docs/provider-integrations.md` explaining Mindee and HERE setup, limitations, fallback modes, and how to add another provider.
- `docs/security.md` summarizing roles, RLS, storage, service keys, audit trail, and threat considerations.
- `docs/operations.md` covering failed OCR, stuck offline uploads, duplicate review, user deactivation, and backup/export procedures.
- database diagram in Mermaid inside the README or docs.

## 23. Work sequence for Cursor Agent

Use this order and keep the app runnable after each phase:

1. Inspect repository and current tooling.
2. Bootstrap/configure Next.js, lint, types, tests, brand config, and base responsive shell.
3. Write database migrations, RLS, storage policies, generated TypeScript types, and seed.
4. Implement Supabase SSR auth, organization/role guards, and admin invites.
5. Implement trucks, assignments, and organization settings.
6. Implement receipt capture, private upload, offline queue, and manual review/submission.
7. Implement OCR provider interface and Mindee adapter.
8. Implement receipt management, duplicate logic, verification, and audit trail.
9. Implement fuel estimate calculations and truck dashboards.
10. Implement reports/CSV exports.
11. Implement stations, price imports, Savings Finder, manual route planning, and optional HERE adapter.
12. Add complete loading/empty/error/offline states.
13. Run security review, responsive matrix, interaction journeys, automated tests, and production build.
14. Complete documentation and deployment handoff.

After every phase, run the relevant checks and fix errors before proceeding. Do not leave placeholder buttons, fake charts, hard-coded report numbers, or `TODO` comments in a feature claimed as complete.

## 24. Decisions that are intentionally not blockers

Use these defaults until the owner confirms otherwise:

- working name: FuelTrail
- first organization timezone: America/Chicago
- currency: USD
- tank capacity: 200 gallons
- target MPG: 6.5
- week-start minimum: 100 gallons
- reserve: 25 gallons
- purchase increments: 5 gallons
- OCR mode: manual unless a Mindee key is configured
- route/fuel data mode: manual unless HERE access is configured
- receipt retention: minimum four years

Make every default editable by an owner/manager where appropriate.

## 25. Handoff format

When finished, report:

- concise product summary
- repository path and Git branch
- key architecture choices
- migrations created
- environment variables still needed
- automated test/build results
- exact Supabase and Vercel deployment steps remaining
- known limitations, especially IFTA mileage and live fuel-data access
- five recommended real-world pilot tests using actual driver phones/receipts

Do not say `complete` if the build fails, RLS is absent, receipts use public URLs, or core screens contain mocked data.

## 26. Authoritative implementation references

- IFTA/receipt and distance record requirements: https://iowadot.gov/motor-carriers/ifta-international-fuel-tax-agreement/ifta-record-keeping-requirements
- IFTA organization and tax-rate downloads: https://www.iftach.org/
- Supabase Next.js user-management example: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Mindee receipt OCR: https://www.mindee.com/product/receipt-ocr-api
- HERE Fuel Prices API: https://docs.here.com/fuel-prices/docs/fuel-prices-intro

Before implementing an external provider, Cursor must verify its current official documentation, authentication, access tier, market coverage, request limits, response schema, and terms. Keep provider-specific details behind the interfaces above.
