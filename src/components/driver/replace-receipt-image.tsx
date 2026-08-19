"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sha256Hex } from "@/lib/calculations";

export function ReplaceReceiptImage({ receiptId }: { receiptId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function replace() {
    if (!file) return;
    setWorking(true);
    setStatus("Uploading replacement image…");
    try {
      const initiate = await fetch(`/api/receipts/${receiptId}/replace-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "initiate", fileName: file.name || "receipt.jpg" }),
      });
      const initiated = await initiate.json();
      if (!initiate.ok) throw new Error(initiated.error?.message ?? "Could not start replacement.");
      const upload = await fetch(initiated.data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg", "x-upsert": "false" },
        body: file,
      });
      if (!upload.ok) throw new Error("Storage upload failed.");
      const sha = await sha256Hex(await file.arrayBuffer());
      const complete = await fetch(`/api/receipts/${receiptId}/replace-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "complete", sha256: sha }),
      });
      const completed = await complete.json();
      if (!complete.ok) throw new Error(completed.error?.message ?? "Could not save replacement.");
      setStatus("Reading the new photo…");
      await fetch(`/api/receipts/${receiptId}/ocr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      router.push(`/driver/receipts/${receiptId}/review`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Replacement failed.");
      setWorking(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          setFile(next);
          setPreview(next ? URL.createObjectURL(next) : null);
        }}
      />
      {!preview ? (
        <Button className="w-full" size="lg" variant="amber" onClick={() => inputRef.current?.click()}>
          Open camera
        </Button>
      ) : (
        <Card className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Replacement preview" className="max-h-80 w-full object-contain" />
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => inputRef.current?.click()}>
              Retake
            </Button>
            <Button className="flex-1" variant="amber" onClick={replace} disabled={working}>
              {working ? "Working…" : "Use photo"}
            </Button>
          </div>
        </Card>
      )}
      {status ? <p className="text-sm text-[#5E6B75]">{status}</p> : null}
      <p className="text-sm text-[#5E6B75]">The previous photo is kept. This creates a new version of the same receipt.</p>
    </div>
  );
}
