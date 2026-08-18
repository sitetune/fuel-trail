"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";

type Extraction = {
  merchantName?: { value: string | null; confidence: number | null };
  merchantAddress?: { value: string | null; confidence: number | null };
  merchantCity?: { value: string | null; confidence: number | null };
  merchantRegion?: { value: string | null; confidence: number | null };
  gallons?: { value: number | null; confidence: number | null };
  totalAmount?: { value: number | null; confidence: number | null };
  purchasedAt?: { value: string | null; confidence: number | null };
  warnings?: string[];
};

function low(confidence: number | null | undefined) {
  return confidence !== null && confidence !== undefined && confidence < 0.6;
}

export function ReceiptReviewForm({
  receiptId,
  truckId,
  truckUnit,
  purchaserName,
  extraction,
  imagePath,
}: {
  receiptId: string;
  truckId: string;
  truckUnit: string;
  purchaserName: string;
  extraction: Extraction | null;
  imagePath: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadImage() {
    const response = await fetch(`/api/receipts/${receiptId}/signed-image`);
    if (response.ok) {
      const json = await response.json();
      setImageUrl(json.data.url);
    }
  }

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
    <form action={onSubmit} className="space-y-4">
      <Card className="space-y-2">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Stored receipt" className="max-h-64 w-full object-contain" />
        ) : (
          <Button type="button" variant="outline" onClick={loadImage} disabled={!imagePath}>
            Show stored receipt image
          </Button>
        )}
        {(extraction?.warnings ?? []).map((warning) => (
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
          className={highlight(extraction?.purchasedAt?.confidence ?? null, !extraction?.purchasedAt?.value)}
          defaultValue={extraction?.purchasedAt?.value?.slice(0, 16) ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="merchantName">Merchant</Label>
        <Input
          id="merchantName"
          name="merchantName"
          required
          className={highlight(extraction?.merchantName?.confidence ?? null, !extraction?.merchantName?.value)}
          defaultValue={extraction?.merchantName?.value ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="merchantAddress">Address</Label>
        <Input
          id="merchantAddress"
          name="merchantAddress"
          required
          className={highlight(extraction?.merchantAddress?.confidence ?? null, !extraction?.merchantAddress?.value)}
          defaultValue={extraction?.merchantAddress?.value ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="merchantCity">City</Label>
          <Input id="merchantCity" name="merchantCity" required defaultValue={extraction?.merchantCity?.value ?? ""} />
        </div>
        <div>
          <Label htmlFor="merchantRegion">State</Label>
          <Input
            id="merchantRegion"
            name="merchantRegion"
            required
            maxLength={2}
            className={highlight(extraction?.merchantRegion?.confidence ?? null, !extraction?.merchantRegion?.value)}
            defaultValue={extraction?.merchantRegion?.value ?? ""}
          />
        </div>
      </div>
      <Input name="merchantPostalCode" placeholder="ZIP (optional)" />
      <Input name="receiptNumber" placeholder="Receipt number (optional)" />
      <Input name="purchaserName" defaultValue={purchaserName} required />
      <Input name="fuelType" defaultValue="diesel" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="gallons">Gallons</Label>
          <Input
            id="gallons"
            name="gallons"
            type="number"
            step="0.001"
            required
            className={highlight(extraction?.gallons?.confidence ?? null, !extraction?.gallons?.value)}
            defaultValue={extraction?.gallons?.value ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="pricePerGallon">Price / gal</Label>
          <Input id="pricePerGallon" name="pricePerGallon" type="number" step="0.0001" />
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
          className={highlight(extraction?.totalAmount?.confidence ?? null, !extraction?.totalAmount?.value)}
          defaultValue={extraction?.totalAmount?.value ?? ""}
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
      <Button type="submit" variant="amber" size="lg" className="w-full" disabled={busy}>
        Submit receipt
      </Button>
      <Badge tone="amber">OCR is an assistant. Confirm every value before submitting.</Badge>
    </form>
  );
}
