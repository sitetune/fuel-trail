"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReceiptBatchBar({
  receipts,
}: {
  receipts: Array<{ id: string; label: string }>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  if (receipts.length === 0) return null;
  const href = selected.length ? `/manage/receipts/print/batch?ids=${selected.join(",")}` : "";
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">Print this page</p>
        <Button asChild variant="outline" disabled={!selected.length}>
          <a href={href || "#"}>Print selected ({selected.length})</a>
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {receipts.map((receipt) => (
          <label key={receipt.id} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={selected.includes(receipt.id)}
              onChange={() =>
                setSelected((current) =>
                  current.includes(receipt.id) ? current.filter((id) => id !== receipt.id) : [...current, receipt.id],
                )
              }
            />
            {receipt.label}
          </label>
        ))}
      </div>
    </Card>
  );
}
