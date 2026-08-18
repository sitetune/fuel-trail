"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";
import { extractionHasValues } from "@/lib/ocr/parse-text";
import { recognizeReceiptText } from "@/lib/ocr/browser";
import type { NormalizedReceiptExtraction } from "@/lib/ocr/types";

function low(confidence: number | null | undefined) {
  return confidence !== null && confidence !== undefined && confidence < 0.6;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocal(value: string | null | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
  }
  return "";
}

function numberValue(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

export function ReceiptReviewForm({
  receiptId,
  truckId,
  truckUnit,
  purchaserName,
  extraction,
}: {
  receiptId: string;
  truckId: string;
  truckUnit: string;
  purchaserName: string;
  extraction: NormalizedReceiptExtraction | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(!extractionHasValues(extraction));
  const [ocrStatus, setOcrStatus] = useState(
    extractionHasValues(extraction) ? null : "Reading merchant, gallons, and total from the photo…",
  );
  const [fields, setFields] = useState(extraction);

  useEffect(() => {
    let cancelled = false;
    async function fillFromPhoto() {
      if (extractionHasValues(extraction)) return;
      setOcrBusy(true);
      setOcrStatus("Reading the receipt…");
      try {
        const first = await fetch(`/api/receipts/${receiptId}/ocr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const firstJson = await first.json();
        const firstExtracted = firstJson.data?.extracted as NormalizedReceiptExtraction | undefined;
        if (firstExtracted && extractionHasValues(firstExtracted) && firstExtracted.provider !== "manual") {
          if (!cancelled) setFields(firstExtracted);
          return;
        }
        setOcrStatus("Trying a second pass on this photo…");
        const image = await fetch(`/api/receipts/${receiptId}/image`);
        if (!image.ok) throw new Error("image");
        const blob = await image.blob();
        const rawText = await recognizeReceiptText(blob);
        const response = await fetch(`/api/receipts/${receiptId}/ocr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText }),
        });
        const json = await response.json();
        if (!cancelled && json.data?.extracted) {
          setFields(json.data.extracted as NormalizedReceiptExtraction);
        }
      } catch {
        if (!cancelled) {
          setOcrStatus("Could not auto-read this photo. Enter the values from the image.");
        }
      } finally {
        if (!cancelled) setOcrBusy(false);
      }
    }
    void fillFromPhoto();
    return () => {
      cancelled = true;
    };
  }, [extraction, receiptId]);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    const payload = {
      truckId,
      purchasedAt: String(formData.get("purchasedAt")),
      merchantName: String(formData.get("merchantName")),
      merchantAddress: String(formData.get("merchantAddress")),
      merchantCity: String(formData.get("merchantCity")),
      merchantRegion: String(formData.get("merchantRegion")).toUpperCase(),
      merchantPostalCode: String(formData.get("merchantPostalCode") || "") || null,
      receiptNumber: String(formData.get("receiptNumber") || "") || null,
      purchaserName: String(formData.get("purchaserName")),
      fuelType: String(formData.get("fuelType") || "diesel"),
      gallons: Number(formData.get("gallons")),
      pricePerGallon: formData.get("pricePerGallon") ? Number(formData.get("pricePerGallon")) : null,
      totalAmount: Number(formData.get("totalAmount")),
      odometer: formData.get("odometer") ? Number(formData.get("odometer")) : null,
      tankLevelAfterMode: String(formData.get("tankLevelAfterMode")),
      tankLevelAfterValue: formData.get("tankLevelAfterValue")
        ? Number(formData.get("tankLevelAfterValue"))
        : null,
      trailerAttached: formData.get("trailerAttached") === "on",
      driverNote: String(formData.get("driverNote") || "") || null,
    };
    const response = await fetch(`/api/receipts/${receiptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(json.error?.message ?? "Could not submit.");
      return;
    }
    router.push(`/driver/receipts/${receiptId}/submitted`);
  }

  const highlight = (confidence: number | null | undefined, missing: boolean) =>
    missing || low(confidence) ? "border-[#F5A524] bg-[#F5A524]/10" : "";

  return (
    <form action={onSubmit} className="space-y-4" key={fields?.providerDocumentId ?? fields?.rawText ?? "empty"}>
      <Card className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/receipts/${receiptId}/image`}
          alt="Stored receipt"
          className="max-h-64 w-full object-contain"
        />
        {ocrBusy ? <p className="text-sm text-[#0B1F33]">{ocrStatus}</p> : null}
        {!ocrBusy && ocrStatus && !extractionHasValues(fields) ? (
          <p className="text-sm text-[#0B1F33]">{ocrStatus}</p>
        ) : null}
        {(fields?.warnings ?? []).map((warning) => (
          <p key={warning} className="text-sm text-[#0B1F33]">
            {warning}
          </p>
        ))}
      </Card>
      <div>
        <Label>Truck</Label>
        <Input name="truckDisplay" defaultValue={truckUnit} readOnly />
      </div>
      <div>
        <Label htmlFor="purchasedAt">Purchase date/time</Label>
        <Input
          id="purchasedAt"
          name="purchasedAt"
          type="datetime-local"
          required
          className={highlight(fields?.purchasedAt?.confidence ?? null, !fields?.purchasedAt?.value)}
          defaultValue={toDateTimeLocal(fields?.purchasedAt?.value)}
        />
      </div>
      <div>
        <Label htmlFor="merchantName">Merchant</Label>
        <Input
          id="merchantName"
          name="merchantName"
          required
          className={highlight(fields?.merchantName?.confidence ?? null, !fields?.merchantName?.value)}
          defaultValue={fields?.merchantName?.value ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="merchantAddress">Address</Label>
        <Input
          id="merchantAddress"
          name="merchantAddress"
          required
          className={highlight(fields?.merchantAddress?.confidence ?? null, !fields?.merchantAddress?.value)}
          defaultValue={fields?.merchantAddress?.value ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="merchantCity">City</Label>
          <Input
            id="merchantCity"
            name="merchantCity"
            required
            className={highlight(fields?.merchantCity?.confidence ?? null, !fields?.merchantCity?.value)}
            defaultValue={fields?.merchantCity?.value ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="merchantRegion">State</Label>
          <Input
            id="merchantRegion"
            name="merchantRegion"
            required
            maxLength={2}
            className={highlight(fields?.merchantRegion?.confidence ?? null, !fields?.merchantRegion?.value)}
            defaultValue={fields?.merchantRegion?.value ?? ""}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="merchantPostalCode">ZIP</Label>
        <Input
          id="merchantPostalCode"
          name="merchantPostalCode"
          className={highlight(fields?.merchantPostalCode?.confidence ?? null, !fields?.merchantPostalCode?.value)}
          defaultValue={fields?.merchantPostalCode?.value ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="receiptNumber">Receipt number</Label>
        <Input
          id="receiptNumber"
          name="receiptNumber"
          className={highlight(fields?.receiptNumber?.confidence ?? null, !fields?.receiptNumber?.value)}
          defaultValue={fields?.receiptNumber?.value ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="purchaserName">Purchaser</Label>
        <Input id="purchaserName" name="purchaserName" defaultValue={purchaserName} required />
      </div>
      <input type="hidden" name="fuelType" value={fields?.fuelType?.value ?? "diesel"} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="gallons">Gallons</Label>
          <Input
            id="gallons"
            name="gallons"
            type="number"
            step="0.001"
            required
            className={highlight(fields?.gallons?.confidence ?? null, !fields?.gallons?.value)}
            defaultValue={numberValue(fields?.gallons?.value)}
          />
        </div>
        <div>
          <Label htmlFor="pricePerGallon">Price / gal</Label>
          <Input
            id="pricePerGallon"
            name="pricePerGallon"
            type="number"
            step="0.0001"
            className={highlight(fields?.pricePerGallon?.confidence ?? null, !fields?.pricePerGallon?.value)}
            defaultValue={numberValue(fields?.pricePerGallon?.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="totalAmount">Total</Label>
        <Input
          id="totalAmount"
          name="totalAmount"
          type="number"
          step="0.01"
          required
          className={highlight(fields?.totalAmount?.confidence ?? null, !fields?.totalAmount?.value)}
          defaultValue={numberValue(fields?.totalAmount?.value)}
        />
      </div>
      <Input name="odometer" type="number" step="0.1" placeholder="Odometer (optional)" />
      <div>
        <Label htmlFor="tankLevelAfterMode">Tank after fueling</Label>
        <select
          id="tankLevelAfterMode"
          name="tankLevelAfterMode"
          className="h-11 w-full rounded-md border border-[#5E6B75]/30 px-3"
          defaultValue="unknown"
        >
          <option value="unknown">Unknown</option>
          <option value="full">Full</option>
          <option value="percent">Percent</option>
          <option value="gallons">Gallons remaining</option>
        </select>
        <Input name="tankLevelAfterValue" type="number" step="0.1" placeholder="Percent or gallons if used" className="mt-2" />
      </div>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" name="trailerAttached" defaultChecked className="h-5 w-5" />
        Trailer attached
      </label>
      <Textarea name="driverNote" placeholder="Note for managers (optional)" />
      <FieldError message={error ?? undefined} />
      <Button type="submit" variant="amber" size="lg" className="w-full" disabled={busy || ocrBusy}>
        {ocrBusy ? "Reading receipt…" : "Submit receipt"}
      </Button>
      <Badge tone="amber">OCR is an assistant. Confirm every value before submitting.</Badge>
    </form>
  );
}
