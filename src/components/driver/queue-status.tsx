"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listQueuedReceipts, type QueuedReceipt } from "@/lib/offline/queue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function QueueStatus({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    window.localStorage.setItem("fueltrail-user-id", userId);
    listQueuedReceipts(userId).then((items) => setCount(items.length));
  }, [userId]);
  if (count === 0) return null;
  return (
    <Card className="flex items-center justify-between border-[#F5A524]">
      <p>
        <strong>{count}</strong> waiting to upload
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/driver/queue">Retry</Link>
      </Button>
    </Card>
  );
}

export function QueueList({ userId }: { userId: string }) {
  const [items, setItems] = useState<QueuedReceipt[]>([]);
  const refresh = useCallback(() => listQueuedReceipts(userId).then(setItems), [userId]);
  useEffect(() => {
    void refresh();
    const onOnline = () => {
      void refresh();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);
  return (
    <div className="space-y-3">
      {items.length === 0 ? <Card>No queued receipts.</Card> : null}
      {items.map((item) => (
        <Card key={item.id}>
          <p className="font-medium">Waiting to upload</p>
          <p className="text-sm text-[#5E6B75]">{item.fileName}</p>
          <RetryButton item={item} onDone={refresh} />
        </Card>
      ))}
    </div>
  );
}

function RetryButton({ item, onDone }: { item: QueuedReceipt; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      className="mt-3 w-full"
      variant="amber"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { flushQueuedReceipt } = await import("@/components/driver/flush-queue");
        const receiptId = await flushQueuedReceipt(item);
        setBusy(false);
        onDone();
        if (receiptId) {
          router.push(`/driver/receipts/${receiptId}/review`);
        }
      }}
    >
      Retry upload
    </Button>
  );
}
