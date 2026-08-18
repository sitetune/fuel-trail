"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";

type Receipt = {
  id: string;
  merchant_name: string | null;
  gallons: number | null;
  total_amount: number | null;
  merchant_region: string | null;
  status: string;
  original_image_path: string | null;
  trucks: { unit_number: string } | null;
  duplicate_of: string | null;
  duplicate_override: boolean;
};

export function ReceiptManager({
  receipt,
  events,
}: {
  receipt: Receipt;
  events: Array<{ id: string; event_type: string; created_at: string; field_changes: unknown }>;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [merchant, setMerchant] = useState(receipt.merchant_name ?? "");
  const [gallons, setGallons] = useState(String(receipt.gallons ?? ""));
  const [reason, setReason] = useState("");

  async function loadImage() {
    const response = await fetch(`/api/receipts/${receipt.id}/signed-image`);
    if (response.ok) {
      const json = await response.json();
      setImageUrl(json.data.url);
    }
  }

  async function act(action: "verify" | "reject" | "override_duplicate" | "archive") {
    await fetch(`/api/receipts/${receipt.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason,
        corrections: { merchant_name: merchant, gallons: Number(gallons) },
      }),
    });
    window.location.reload();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Unit {receipt.trucks?.unit_number}</h1>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Receipt original" className="max-h-[70vh] w-full object-contain" />
        ) : (
          <Button onClick={loadImage} variant="outline">
            Load original image
          </Button>
        )}
      </Card>
      <div className="space-y-4">
        <Card className="space-y-3">
          <Label>Merchant</Label>
          <Input value={merchant} onChange={(event) => setMerchant(event.target.value)} />
          <Label>Gallons</Label>
          <Input value={gallons} onChange={(event) => setGallons(event.target.value)} />
          <p className="text-sm text-[#5E6B75]">
            {receipt.merchant_region} · {receipt.status}
            {receipt.duplicate_of && !receipt.duplicate_override ? " · likely duplicate" : ""}
          </p>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reject reason" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => act("verify")} variant="success">
              Verify
            </Button>
            <Button onClick={() => act("reject")} variant="danger">
              Reject
            </Button>
            <Button onClick={() => act("override_duplicate")} variant="outline">
              Override duplicate
            </Button>
            <Button onClick={() => act("archive")} variant="ghost">
              Archive
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Audit trail</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.event_type}</strong> · {new Date(event.created_at).toLocaleString()}
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
    </div>
  );
}
