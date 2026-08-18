# Product scope

## In this MVP

- Organization-scoped data with roles `owner_admin`, `manager`, and `driver`
- Email/password auth, invites, deactivation
- Truck records, assignments, estimated fuel gauge
- Receipt capture, private original storage, OCR or manual review, audit trail
- Manager inbox, truck dashboard, month-over-month explanations
- IFTA-ready fuel purchase worksheet + CSV
- Savings observations from stored prices
- Manual fuel-stop planner + optional HERE adapter
- CSV price import and offline capture queue

## Explicitly deferred

- Actual tax filing or remittance
- Automatic mileage-by-jurisdiction from ELD/GPS
- Fuel-card payment processing
- Telematics / live tank sensors
- Native iOS/Android apps
- Driver payroll, dispatch, loads, maintenance, TMS
- Push/SMS notifications
- Automatic vendor contracts for live fuel pricing

Extension points exist (`ReceiptOcrProvider`, `FuelRouteProvider`, odometer fields, `route_plans`) without blocking the MVP on those vendors.
