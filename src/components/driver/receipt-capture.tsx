"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sha256Hex } from "@/lib/calculations";
import { saveQueuedReceipt } from "@/lib/offline/queue";
import { flushQueuedReceipt } from "./flush-queue";

export function ReceiptCapture({
  userId,
  organizationId,
  truckId,
}: {
  userId: string;
  organizationId: string;
  truckId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    window.localStorage.setItem("fueltrail-user-id", userId);
  }, [userId]);

  function onFile(next: File | null) {
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function usePhoto() {
    if (!file || !truckId) return;
    const id = crypto.randomUUID();
    const bytes = await file.arrayBuffer();
    const sha = await sha256Hex(bytes);
    const queued = {
      id,
      userId,
      organizationId,
      truckId,
      createdAt: new Date().toISOString(),
      fileName: file.name || "receipt.jpg",
      mimeType: file.type || "image/jpeg",
      blob: file,
      sha256: sha,
      status: "waiting_to_upload" as const,
    };
    await saveQueuedReceipt(queued);
    if (!navigator.onLine) {
      setStatus("Waiting to upload — you are offline. Open Queue and tap Retry when you have service.");
      return;
    }
    setWorking(true);
    setStatus("Uploading original receipt…");
    try {
      const receiptId = await flushQueuedReceipt(queued, {
        onStatus: setStatus,
      });
      if (receiptId) {
        router.push(`/driver/receipts/${receiptId}/review`);
        return;
      }
      setStatus("Upload failed. The photo is saved on this device — use Retry.");
      router.push("/driver/queue");
    } catch {
      setStatus("Upload failed. The photo is saved on this device — use Retry.");
      router.push("/driver/queue");
    } finally {
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
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
      {!preview ? (
        <div className="space-y-3">
          <Button className="w-full" size="lg" variant="primary" onClick={() => inputRef.current?.click()}>
            Open camera
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.removeAttribute("capture");
                inputRef.current.click();
              }
            }}
          >
            Choose from gallery
          </Button>
        </div>
      ) : (
        <Card className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Receipt preview" className="max-h-80 w-full rounded-md object-contain" />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                setPreview(null);
                setFile(null);
                inputRef.current?.click();
              }}
            >
              Retake
            </Button>
            <Button className="flex-1" variant="primary" onClick={usePhoto} disabled={!truckId || working}>
              {working ? "Working…" : "Use photo"}
            </Button>
          </div>
        </Card>
      )}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}
