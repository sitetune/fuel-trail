# FuelTrail Phase 2 Roadmap

Phase 2 is **complete for pilot use**. Remaining commercial work (pricing, Stripe, self-serve checkout) is Phase 3.

Phase 2 is **Fleet Operations & SaaS Readiness**.

Its purpose is to transform the working MVP into a dependable product that multiple trucking companies can onboard, operate, and pilot. Phase 3 then adds pricing, Stripe billing, subscriptions, and the full commercial launch.

## Phase boundaries

| Phase | Goal | Outcome |
| --- | --- | --- |
| MVP | Prove receipt capture and fuel reporting | Complete and published |
| Phase 2 | Productize operations and multi-company onboarding | Ready for external pilot companies |
| Phase 3 | Monetize and launch | Monthly/annual subscriptions and public sales |
| Future | Expand transportation integrations | ELD, fuel cards, advanced IFTA, live pricing |

Phase 2 can support manually invoiced customers or free pilots. Broad self-service sales should wait for Phase 3.

## Phase 2 workstreams

### 1. Receipt lifecycle overhaul

This is the highest-priority work because it affects every driver and manager.

#### Receipt Center

Replace the limited “Latest Receipts” experience with a full Receipt Center.

Every receipt row/card should show:

- Receipt thumbnail
- Transaction date
- Submission date
- Driver
- Truck/unit number
- Merchant
- City and state
- Gallons
- Price per gallon
- Total fuel cost
- Current status
- OCR confidence warning
- Date verified/rejected
- Manager who reviewed it
- Whether it has been included in a report

Provide:

- Pagination or infinite loading
- Search by merchant, driver, truck, or receipt number
- Filters for status, driver, truck, date range, merchant, state, report status, and OCR confidence
- Sorting by date, total, gallons, status, and submission time
- Mobile card view and desktop table view
- Click-through to the complete receipt record

The dashboard can still show the latest few receipts, but it should link to the authoritative Receipt Center.

#### Receipt state model

Use one consistent state machine throughout the driver app, manager app, reports, and notifications.

Every state transition must:

- Update immediately in all interfaces
- Record who made the change
- Record when it happened
- Generate the appropriate audit event
- Generate a notification when applicable
- Preserve prior values

Fixing the current rejection-status bug is a Phase 2 release blocker.

#### Rejection and resubmission

When a receipt is rejected, the driver must see:

- A red **Rejected — Action Required** status
- Thumbnail of the rejected receipt
- Merchant, truck, date, and amount for identification
- Manager’s rejection reason
- Rejection date
- **Correct Information** action
- **Replace Receipt Image** action
- **Resubmit** action

Replacing an image should create a new receipt version instead of deleting the rejected evidence.

#### Driver receipt detail

Drivers should be able to open past receipts and view:

- Original image
- Extracted values
- Corrections
- Current status
- Review history
- Rejection reason
- Report status

Drivers can correct draft, needs-review, and rejected receipts. Changes to verified receipts should require manager permission.

### 2. Complete manager receipt workspace

Create a proper two-panel receipt review experience:

- Original/display receipt image on the left
- Editable receipt fields on the right
- Audit and status history below or in a side panel

Editable fields should include:

- Driver
- Truck
- Transaction date and time
- Merchant
- Receipt or transaction number
- Street address
- City
- State
- ZIP code
- Fuel type
- Gallons
- Price per gallon
- Fuel subtotal
- Tax
- Other purchases
- Total
- Odometer
- Payment-card last four
- Trailer-drop information
- Driver notes
- Manager notes

Include validation such as:

- Gallons × price per gallon should approximately match fuel subtotal
- Transaction date cannot be unreasonably far in the future
- Gallons and totals must be positive
- Verified receipts require a truck and transaction state
- Warn about possible duplicates

Each field should optionally display:

- OCR confidence
- Original OCR value
- Corrected value
- Person who corrected it
- Thumbnail preview

In the manager table:

- Hovering over a thumbnail can show a larger preview
- Clicking must open the full receipt
- Mobile users need a tap-based preview
- Hover cannot be the only way to access anything

### 3. Receipt printing and document handling

Managers should be able to print or save receipts without retrieving the physical copy.

Provide:

- Print one receipt
- Print selected receipts
- Print all receipts in a filtered result
- Download original image
- Download a PDF containing the receipt image and recorded data
- Print-friendly CSS
- Status watermark: Verified, Rejected, Duplicate, or Unverified
- Truck, driver, and transaction information in the print header
- Audit summary and manager verification date

Batch printing should avoid producing an unusable giant document. Set a reasonable limit and offer a ZIP or generated PDF for larger selections.

Also implement the missing compressed display copy:

- Preserve untouched original privately
- Generate an optimized display image
- Use the display copy for lists, previews, and routine review
- Use the original for downloads and high-resolution verification

### 4. User and permissions management

The organization owner/admin needs a complete user-management area.

#### User capabilities

- Edit name and contact information
- Change role
- Assign or unassign trucks
- Resend invitation
- Revoke pending invitation
- Deactivate/reactivate user
- View last login
- View submission and review activity
- Transfer a driver’s active truck assignment
- Filter by role, status, and assigned truck

#### Safety rules

- Never permanently delete a user with receipt history
- Deactivation must preserve all historical records
- Managers cannot remove the final organization owner
- Role changes and deactivation must be audited
- Email-address changes should follow the authentication provider’s secure verification process

Recommended roles:

- Organization Owner
- Organization Admin
- Manager
- Driver
- Read-only Auditor

Avoid creating dozens of granular permissions in Phase 2. Add a permission framework that can support custom roles later.

### 5. Fleet management and bulk import

Create a dedicated Fleet area for managing trucks, drivers, and assignments.

#### Truck management

Support:

- Add and edit truck
- Unit number
- VIN
- License plate and state
- Year, make, and model
- Fuel type
- Tank capacity
- Active/inactive status
- Default driver
- Notes
- Effective assignment dates

Trucks with history should be deactivated, not deleted.

#### Import Center

Provide separate downloadable templates for:

- Trucks
- Drivers
- Driver-to-truck assignments

The import workflow should include:

1. Download template or upload an existing CSV
2. Select the data type
3. Map uploaded columns
4. Preview normalized records
5. Validate data
6. Identify duplicates
7. Choose skip or update behavior
8. Confirm import
9. Review results
10. Download an error file

Required import functionality:

- Column mapping
- Saved mappings
- Clear required-field indicators
- Duplicate detection
- Per-row errors
- Atomic or safely recoverable imports
- Import history
- Import summary
- Audit log
- Optional invitation sending after driver import

Do not automatically email every imported driver. Let the admin review the import and then select which drivers receive invitations.

### 6. Notification system

Phase 2 should introduce in-app and email notifications. Push and SMS remain deferred.

#### Driver notifications

- Receipt uploaded successfully
- OCR requires manual review
- Receipt submitted
- Receipt verified
- Receipt rejected
- Receipt correction requested
- Replacement receipt accepted

“Success” should describe the actual outcome. An upload success is different from a manager verification.

#### Manager notifications

- New receipt submitted
- OCR failed or produced low confidence
- Possible duplicate detected
- Rejected receipt resubmitted
- Fleet import completed
- Fleet import failed
- Unreviewed receipts aging past a threshold

#### Notification requirements

- Notification center with unread badge
- Deep links to the relevant receipt or import
- Mark one or all as read
- Email preferences by event type
- Idempotency so one action does not produce repeated alerts
- Organization-aware templates
- No receipt images or sensitive details in email unless sent through secure links

### 7. Reporting improvements

Upgrade reports from a basic CSV exporter into an operational reporting workspace.

Provide filters for:

- Truck
- Driver
- Date range
- Merchant
- State
- Receipt status
- Reported/unreported status
- Fuel type

Provide:

- Truck-grouped on-screen worksheet
- Totals by truck
- Gallons, fuel cost, and average price per gallon
- Verified versus unverified counts
- Printable view
- CSV export matching the visible filters
- Report-run history
- Ability to reopen a prior report
- Identification of which report included each receipt

Reports should use snapshots or report membership records. Otherwise, editing a receipt later can silently change a previously generated report.

If a reported receipt is corrected, mark it as **Amended** and show which report may need regeneration.

Keep the existing IFTA limitation clearly visible. Do not market these reports as complete IFTA filing without mileage-by-jurisdiction data.

### 8. Expanded audit capabilities

Create an organization-level Audit Log.

Capture:

- Actor
- Action
- Entity type and ID
- Before and after values
- Date and time
- Receipt status transition
- User/role changes
- Truck assignments
- Imports
- Report generation
- Original-image replacement
- Notification delivery failures
- Support access

Provide filters, search, entity links, and CSV export.

Audit entries should be append-only. Users should not be able to edit or delete audit events.

For receipt edits, present a readable field-by-field diff rather than only raw JSON.

### 9. Multi-company onboarding

Phase 2 should establish the account flow that Phase 3 billing will later attach to.

#### Organization signup

A trucking-company owner should be able to:

1. Create an account
2. Verify email
3. Create the company organization
4. Enter company details
5. Configure receipt requirements
6. Import trucks
7. Import drivers
8. Send invitations
9. Submit a test receipt
10. Reach a launch checklist

Organization settings should include:

- Company name
- Logo
- Address
- Primary contact
- Time zone
- Default fuel type
- Receipt review rules
- Notification preferences
- Data-retention settings
- Report defaults

Use pilot access or manual activation during Phase 2. Phase 3 will insert plan selection and checkout into this workflow.

#### Internal platform administration

FuelTrail needs a separate internal admin area for:

- Viewing customer organizations
- Organization status
- User and receipt counts
- Storage usage
- Import failures
- Notification failures
- OCR failures and cost
- Deactivating an organization
- Providing audited, time-limited support access

Do not implement invisible, unrestricted impersonation.

### 10. Savings Finder accuracy

Complete the unfinished savings logic:

- Configurable search radius
- Configurable price age/time window
- Same-station historical prices
- Confidence based on price freshness
- Trailer-drop feasibility notes
- Clear assumptions used in savings calculations
- Detection and exclusion of outdated or suspicious prices
- Savings history by truck and route

Savings must remain labeled as **estimated**. Avoid presenting a theoretical lower fuel price as guaranteed savings.

### 11. Quality, security, and release readiness

#### Required end-to-end journeys

Enable Playwright in CI and cover at least:

1. Organization owner signup
2. Driver invitation and activation
3. Manager invitation and permissions
4. Fleet CSV import
5. Driver camera/gallery receipt upload
6. OCR review and submission
7. Offline queue and retry
8. Manager correction and verification
9. Rejection, driver notification, and resubmission
10. Receipt printing and filtered reporting
11. Cross-organization data isolation

Replace the 1×1 fixture with realistic synthetic receipt images.

#### Security work

- Re-test RLS for every new table
- Verify cross-tenant isolation
- Validate file MIME type and size
- Protect storage with signed URLs
- Rate-limit signup, invitations, OCR, and imports
- Prevent spreadsheet formula injection in CSV exports
- Add backup and restore procedures
- Log administrative access
- Add data-export and organization-deactivation procedures

#### Technical debt decisions

- Move receipt hashing to a Web Worker
- Update OCR documentation for Gemini and Mindee
- Use React Hook Form for the new complex editor/import forms
- Use TanStack Table for the new Receipt Center and Audit Log

Do not rewrite every stable native form or table simply because the original specification named those libraries.

## Recommended implementation sequence

| Sprint | Focus | Target |
| --- | --- | --- |
| Sprint 0 | Status bug, observability, schema/state design | 1 week |
| Sprint 1 | Full Receipt Center and receipt detail | 2 weeks |
| Sprint 2 | Rejection/resubmission and notifications | 2 weeks |
| Sprint 3 | Manager editor, compressed images, printing | 2 weeks |
| Sprint 4 | User management and permissions | 1–2 weeks |
| Sprint 5 | Fleet management and import center | 2 weeks |
| Sprint 6 | Reporting, amendments, and audit log | 2 weeks |
| Sprint 7 | Organization onboarding and internal admin | 2 weeks |
| Sprint 8 | Savings accuracy and technical debt | 1–2 weeks |
| Sprint 9 | E2E, security, mobile QA, pilot release | 2 weeks |

Expected Phase 2 duration: approximately **15–18 development weeks**, depending on whether one or multiple developers are working.

## Release priorities

### P0 — Must fix first

- Rejection status not updating
- Full receipt list
- Receipt detail and full editor
- Actionable rejected receipts
- Consistent receipt-state model
- Receipt printing
- Audit every receipt change

### P1 — External pilot requirements

- Notifications
- Advanced receipt filters
- User editing
- Fleet and driver imports
- Report history and amendments
- Compressed display images
- Real E2E coverage
- Multi-company onboarding

### P2 — Strong product improvements

- Expanded savings calculations
- Saved import mappings
- Internal support console
- Organization branding
- Aging receipt alerts
- Advanced audit exports

## Phase 2 definition of done

Phase 2 is complete only when:

- [x] A new trucking company can create and configure its own organization
- [x] It can import trucks and drivers without developer help
- [x] Drivers can identify, correct, replace, and resubmit rejected receipts
- [x] Managers can view and correct every relevant receipt field
- [x] Receipt status is consistent everywhere
- [x] Every material change is audited
- [x] Managers can print individual and batch receipts
- [x] Reports identify exactly which receipts were included
- [x] Tenant isolation has automated tests
- [x] The 11 critical journeys are encoded in CI (`src/lib/journeys/phase2.test.ts` plus Playwright; seeded browser steps need `E2E_*` GitHub secrets)
- [x] Public and authenticated shells are tested at 360, iPhone, tablet, and desktop widths
- [x] A pilot customer can be onboarded without database edits or Cursor intervention

Email alerts send when `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set and the user opts in. Otherwise they stay in-app.

## Phase 3 preview

Phase 3 should then add:

- Public pricing page
- Plan selection
- Stripe Checkout
- Monthly and annual billing
- Free trials
- Subscription webhooks
- Customer billing portal
- Coupons
- Failed-payment recovery
- Cancellation and reactivation
- Usage-based plan limits
- Feature entitlements
- Tax handling
- Terms, privacy, and subscription agreements
- Conversion analytics
- Public marketing and sales site

The important architectural preparation in Phase 2 is to create clean organization, entitlement, usage, and account-status boundaries—without prematurely building the Stripe workflow.
