"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { ReceiptStatusBadge } from "@/components/receipts/status-badge";
import { formatReceiptDate, ocrConfidenceLabel } from "@/lib/receipts/format";

type Receipt = {
  id: string;
  status: string;
  driver_id: string;
  truck_id: string;
  purchased_at: string | null;
  merchant_name: string | null;
  merchant_address: string | null;
  merchant_city: string | null;
  merchant_region: string | null;
  merchant_postal_code: string | null;
  receipt_number: string | null;
  fuel_type: string | null;
  gallons: number | null;
  price_per_gallon: number | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  other_purchases_amount: number | null;
  total_amount: number | null;
  odometer: number | null;
  payment_last4: string | null;
  trailer_attached: boolean | null;
  trailer_dropped: boolean | null;
  trailer_parking_notes: string | null;
  driver_note: string | null;
  manager_note: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  verified_at: string | null;
  ocr_confidence: number | null;
  ocr_extracted_json: { merchantName?: { value?: string | null; confidence?: number | null } } | null;
  duplicate_of: string | null;
  duplicate_override: boolean;
  last_reported_at?: string | null;
  amended_at?: string | null;
  trucks: { unit_number: string } | null;
  profiles: { full_name: string } | null;
};

export function ReceiptWorkspace({
  receipt,
  events,
  trucks,
  drivers,
}: {
  receipt: Receipt;
  events: Array<{ id: string; event_type: string; created_at: string; field_changes: unknown; metadata: unknown }>;
  trucks: Array<{ id: string; unit_number: string }>;
  drivers: Array<{ id: string; full_name: string }>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const extracted = receipt.ocr_extracted_json;

  async function act(action: "verify" | "reject" | "override_duplicate" | "archive" | "amend", form: FormData) {
    setBusy(true);
    setError(null);
    const gallons = String(form.get("gallons") || "");
    const total = String(form.get("total_amount") || "");
    const response = await fetch(`/api/receipts/${receipt.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason: String(form.get("reason") || "") || undefined,
        managerNote: String(form.get("manager_note") || "") || undefined,
        corrections:
          action === "reject"
            ? undefined
            : {
                truck_id: String(form.get("truck_id")),
                driver_id: String(form.get("driver_id")),
                purchased_at: String(form.get("purchased_at") || "") || undefined,
                merchant_name: String(form.get("merchant_name") || "") || undefined,
                merchant_address: String(form.get("merchant_address") || "") || undefined,
                merchant_city: String(form.get("merchant_city") || "") || undefined,
                merchant_region: String(form.get("merchant_region") || "").toUpperCase() || undefined,
                merchant_postal_code: String(form.get("merchant_postal_code") || "") || null,
                receipt_number: String(form.get("receipt_number") || "") || null,
                fuel_type: String(form.get("fuel_type") || "diesel"),
                gallons: gallons ? Number(gallons) : undefined,
                price_per_gallon: form.get("price_per_gallon") ? Number(form.get("price_per_gallon")) : null,
                subtotal_amount: form.get("subtotal_amount") ? Number(form.get("subtotal_amount")) : null,
                tax_amount: form.get("tax_amount") ? Number(form.get("tax_amount")) : null,
                other_purchases_amount: form.get("other_purchases_amount")
                  ? Number(form.get("other_purchases_amount"))
                  : null,
                total_amount: total ? Number(total) : undefined,
                odometer: form.get("odometer") ? Number(form.get("odometer")) : null,
                payment_last4: String(form.get("payment_last4") || "") || null,
                trailer_attached: form.get("trailer_attached") === "on",
                trailer_dropped: form.get("trailer_dropped") === "on",
                trailer_parking_notes: String(form.get("trailer_parking_notes") || "") || null,
                driver_note: String(form.get("driver_note") || "") || null,
                manager_note: String(form.get("manager_note") || "") || null,
              },
      }),
    });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(json.error?.message ?? "Could not update receipt.");
      return;
    }
    router.refresh();
  }

  return (
    <form ref={formRef} className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Unit {receipt.trucks?.unit_number}</h1>
          <ReceiptStatusBadge status={receipt.status} />
        </div>
        {receipt.amended_at ? (
          <p className="text-sm text-[#C93C37]">Amended after appearing in a report. Regenerate the report if needed.</p>
        ) : null}
        {receipt.ocr_confidence != null ? (
          <p className="text-sm text-[#5E6B75]">{ocrConfidenceLabel(Number(receipt.ocr_confidence))}</p>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/receipts/${receipt.id}/image`}
          alt="Receipt original"
          className="max-h-[70vh] w-full object-contain"
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/api/receipts/${receipt.id}/image?original=1`} download>
              Download original
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/manage/receipts/${receipt.id}/print`}>Print / PDF</Link>
          </Button>
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="driver_id">Driver</Label>
            <select id="driver_id" name="driver_id" className="h-11 w-full rounded-md border px-3" defaultValue={receipt.driver_id}>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="truck_id">Truck</Label>
            <select id="truck_id" name="truck_id" className="h-11 w-full rounded-md border px-3" defaultValue={receipt.truck_id}>
              {trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.unit_number}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="purchased_at">Transaction date/time</Label>
            <Input id="purchased_at" name="purchased_at" type="datetime-local" defaultValue={receipt.purchased_at?.slice(0, 16) ?? ""} />
          </div>
          <div>
            <Label htmlFor="merchant_name">Merchant</Label>
            <Input id="merchant_name" name="merchant_name" defaultValue={receipt.merchant_name ?? ""} />
            {extracted?.merchantName?.value && extracted.merchantName.value !== receipt.merchant_name ? (
              <p className="text-xs text-[#5E6B75]">OCR: {extracted.merchantName.value}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="receipt_number">Receipt #</Label>
            <Input id="receipt_number" name="receipt_number" defaultValue={receipt.receipt_number ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="merchant_address">Address</Label>
            <Input id="merchant_address" name="merchant_address" defaultValue={receipt.merchant_address ?? ""} />
          </div>
          <div>
            <Label htmlFor="merchant_city">City</Label>
            <Input id="merchant_city" name="merchant_city" defaultValue={receipt.merchant_city ?? ""} />
          </div>
          <div>
            <Label htmlFor="merchant_region">State</Label>
            <Input id="merchant_region" name="merchant_region" maxLength={2} defaultValue={receipt.merchant_region ?? ""} />
          </div>
          <div>
            <Label htmlFor="merchant_postal_code">ZIP</Label>
            <Input id="merchant_postal_code" name="merchant_postal_code" defaultValue={receipt.merchant_postal_code ?? ""} />
          </div>
          <div>
            <Label htmlFor="fuel_type">Fuel type</Label>
            <Input id="fuel_type" name="fuel_type" defaultValue={receipt.fuel_type ?? "diesel"} />
          </div>
          <div>
            <Label htmlFor="gallons">Gallons</Label>
            <Input id="gallons" name="gallons" type="number" step="0.001" defaultValue={receipt.gallons ?? ""} />
          </div>
          <div>
            <Label htmlFor="price_per_gallon">Price / gal</Label>
            <Input id="price_per_gallon" name="price_per_gallon" type="number" step="0.0001" defaultValue={receipt.price_per_gallon ?? ""} />
          </div>
          <div>
            <Label htmlFor="subtotal_amount">Fuel subtotal</Label>
            <Input id="subtotal_amount" name="subtotal_amount" type="number" step="0.01" defaultValue={receipt.subtotal_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="tax_amount">Tax</Label>
            <Input id="tax_amount" name="tax_amount" type="number" step="0.01" defaultValue={receipt.tax_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="other_purchases_amount">Other purchases</Label>
            <Input
              id="other_purchases_amount"
              name="other_purchases_amount"
              type="number"
              step="0.01"
              defaultValue={receipt.other_purchases_amount ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="total_amount">Total</Label>
            <Input id="total_amount" name="total_amount" type="number" step="0.01" defaultValue={receipt.total_amount ?? ""} />
          </div>
          <div>
            <Label htmlFor="odometer">Odometer</Label>
            <Input id="odometer" name="odometer" type="number" step="0.1" defaultValue={receipt.odometer ?? ""} />
          </div>
          <div>
            <Label htmlFor="payment_last4">Card last four</Label>
            <Input id="payment_last4" name="payment_last4" maxLength={4} defaultValue={receipt.payment_last4 ?? ""} />
          </div>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="trailer_attached" defaultChecked={receipt.trailer_attached ?? true} className="h-5 w-5" />
            Trailer attached
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="trailer_dropped" defaultChecked={Boolean(receipt.trailer_dropped)} className="h-5 w-5" />
            Trailer dropped
          </label>
          <div className="sm:col-span-2">
            <Label htmlFor="trailer_parking_notes">Trailer-drop notes</Label>
            <Input id="trailer_parking_notes" name="trailer_parking_notes" defaultValue={receipt.trailer_parking_notes ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="driver_note">Driver notes</Label>
            <Textarea id="driver_note" name="driver_note" defaultValue={receipt.driver_note ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="manager_note">Manager notes</Label>
            <Textarea id="manager_note" name="manager_note" defaultValue={receipt.manager_note ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="reason">Rejection reason</Label>
            <Textarea id="reason" name="reason" defaultValue={receipt.rejection_reason ?? ""} placeholder="Required when rejecting" />
          </div>
          {receipt.duplicate_of && !receipt.duplicate_override ? (
            <p className="sm:col-span-2 text-sm text-[#C93C37]">Possible duplicate of another receipt.</p>
          ) : null}
          <FieldError message={error ?? undefined} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="success"
              disabled={busy}
              onClick={() => formRef.current && act("verify", new FormData(formRef.current))}
            >
              Verify
            </Button>
            {receipt.status === "verified" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => formRef.current && act("amend", new FormData(formRef.current))}
              >
                Save corrections
              </Button>
            ) : null}
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => formRef.current && act("reject", new FormData(formRef.current))}
            >
              Reject
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => formRef.current && act("override_duplicate", new FormData(formRef.current))}
            >
              Override duplicate
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => formRef.current && act("archive", new FormData(formRef.current))}
            >
              Archive
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Audit and status history</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.event_type.replaceAll("_", " ")}</strong> · {formatReceiptDate(event.created_at)}
                {event.field_changes ? (
                  <pre className="mt-1 overflow-x-auto rounded bg-[#F7F8FA] p-2 text-xs">
                    {JSON.stringify(event.field_changes, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </form>
  );
}
