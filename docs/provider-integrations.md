# Provider integrations

## Receipt OCR — Mindee

Interface: `ReceiptOcrProvider` in `src/lib/ocr`.

- `RECEIPT_OCR_PROVIDER=manual` returns empty fields and a manual-entry warning. Always usable.
- `RECEIPT_OCR_PROVIDER=mindee` calls the current official V1 receipt endpoint:

```text
POST https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict
Authorization: Token $MINDEE_API_KEY
```

Docs: [Mindee Expense Receipt OCR](https://docs.mindee.com/v1/off-the-shelf-products/receipt-ocr.md)

Mindee extracts merchant, date, totals, and line items. Truck gallons and unit numbers are often missing; the review screen requires confirmation. Provider JSON is stored server-side in `ocr_raw_json` / `ocr_extracted_json` and validated with Zod before use.

If the key is missing or the API fails, FuelTrail keeps the original image and switches to manual entry.

To add another OCR vendor, implement `ReceiptOcrProvider` and select it from `getReceiptOcrProvider()`.

## Receipt OCR — Gemini

`RECEIPT_OCR_PROVIDER=gemini` or `auto` uses Gemini vision when `GEMINI_API_KEY` is set. The model returns loose JSON; FuelTrail keeps whatever merchant/date/gallons/total it can parse. The driver must still confirm every field. If Gemini fails, a second pass may use Tesseract in the browser when merchant or date is missing. Original images are never overwritten.

Mindee V2 (`api-v2.mindee.net`) uses model IDs and a different key space. `MINDEE_MODEL_ID` is reserved in `.env.example` for a future adapter; the MVP uses V1 Receipt V5 because it is the documented off-the-shelf receipt product.

## Routing / fuel — HERE

Interface: `FuelRouteProvider` in `src/lib/routing`.

- `FUEL_ROUTE_PROVIDER=manual` is required and complete: haversine fallback plus organization stations/prices.
- `FUEL_ROUTE_PROVIDER=here` uses Routing API v8 truck mode:

```text
GET https://router.hereapi.com/v8/routes?transportMode=truck&origin=&destination=&apiKey=
```

Docs:

- [HERE truck routing](https://docs.here.com/routing/docs/routing-v8-truck-routing)
- [HERE Fuel Prices](https://docs.here.com/fuel-prices/docs/fuel-prices-intro) (`https://fuel.hereapi.com/v3`)

Fuel Prices is a separate SKU. A 401/403 must not break route planning; the adapter returns empty quotes and the UI keeps manual/CSV prices.

Do not scrape GasBuddy, Trucker Path, Mudflap, or similar apps.
