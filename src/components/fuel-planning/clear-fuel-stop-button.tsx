"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ClearFuelStopButton({
  planId,
  label = "Remove fuel stop",
  variant = "outline",
  tone,
}: {
  planId: string;
  label?: string;
  variant?: "outline" | "ghost";
  tone?: "dark" | "light";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant={variant}
        className={
          tone === "dark"
            ? "w-full border-white/30 bg-transparent text-white hover:bg-white/10"
            : "w-full"
        }
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          const response = await fetch("/api/routes/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId }),
          });
          const json = await response.json().catch(() => null);
          setBusy(false);
          if (!response.ok) {
            setMessage(json?.error?.message ?? "Could not remove this stop.");
            return;
          }
          router.refresh();
        }}
      >
        {busy ? "Removing…" : label}
      </Button>
      {message ? <p className="text-sm text-alert">{message}</p> : null}
    </div>
  );
}
