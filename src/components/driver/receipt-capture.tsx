"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { sha256Hex } from "@/lib/calculations";
import { saveQueuedReceipt } from "@/lib/offline/queue";
import { flushQueuedReceipt } from "./flush-queue";

function contrastScore(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < sample.length; i += 32) {
    const gray = 0.299 * sample[i] + 0.587 * sample[i + 1] + 0.114 * sample[i + 2];
    sum += gray;
    sumSq += gray * gray;
    count += 1;
  }
  if (!count) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snappedRef = useRef(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    window.localStorage.setItem("fueltrail-user-id", userId);
  }, [userId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopLive() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
  }

  function onFile(next: File | null) {
    if (!next) return;
    stopLive();
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function startLive() {
    if (!navigator.mediaDevices?.getUserMedia) {
      inputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      snappedRef.current = false;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
      setStatus("Hold the receipt still. Camera snaps when the image is sharp.");
    } catch {
      inputRef.current?.click();
    }
  }

  async function frameToFile() {
    const video = videoRef.current;
    if (!video || video.videoWidth < 16) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return null;
    return new File([blob], "receipt.jpg", { type: "image/jpeg" });
  }

  async function snapNow() {
    if (snappedRef.current) return;
    const next = await frameToFile();
    if (!next) return;
    snappedRef.current = true;
    stopLive();
    setFile(next);
    setPreview(URL.createObjectURL(next));
    await uploadPhoto(next);
  }

  useEffect(() => {
    if (!live) return;
    const started = Date.now();
    // Auto-snap is a timer against the live video element, not render state.
    const timer = window.setInterval(async () => {
      if (snappedRef.current || Date.now() - started < 800) return;
      const video = videoRef.current;
      if (!video || video.videoWidth < 16) return;
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (contrastScore(canvas) > 380) {
        await snapNow();
      }
    }, 250);
    return () => window.clearInterval(timer);
    // snapNow reads the live video element; re-creating the timer on each render would skip autofocus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  async function uploadPhoto(nextFile?: File) {
    const photo = nextFile ?? file;
    if (!photo || !truckId) return;
    const id = crypto.randomUUID();
    const bytes = await photo.arrayBuffer();
    const sha = await sha256Hex(bytes);
    const queued = {
      id,
      userId,
      organizationId,
      truckId,
      createdAt: new Date().toISOString(),
      fileName: photo.name || "receipt.jpg",
      mimeType: photo.type || "image/jpeg",
      blob: photo,
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
      {live ? (
        <Card className="space-y-3 overflow-hidden p-0">
          <video ref={videoRef} className="aspect-[3/4] w-full bg-ink object-cover" playsInline muted autoPlay />
          <div className="space-y-2 p-3">
            <Button className="w-full" size="lg" variant="primary" onClick={() => void snapNow()}>
              Snap now
            </Button>
            <Button className="w-full" variant="outline" onClick={stopLive}>
              Cancel camera
            </Button>
          </div>
        </Card>
      ) : null}
      {!preview && !live ? (
        <div className="space-y-3">
          <Button className="w-full" size="lg" variant="primary" onClick={() => void startLive()}>
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
      ) : null}
      {preview ? (
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
                void startLive();
              }}
            >
              Retake
            </Button>
            <Button className="flex-1" variant="primary" onClick={() => void uploadPhoto()} disabled={!truckId || working}>
              {working ? "Working…" : "Use photo"}
            </Button>
          </div>
        </Card>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}
