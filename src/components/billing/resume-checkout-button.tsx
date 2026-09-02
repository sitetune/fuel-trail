"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResumeCheckoutButton() {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="primary"
        className="w-full"
        onClick={async () => {
          setMessage("");
          const response = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          const payload = (await response.json().catch(() => null)) as
            | { data?: { url?: string }; error?: { message?: string } }
            | null;
          if (payload && "data" in payload && payload.data?.url) {
            window.location.href = payload.data.url;
            return;
          }
          setMessage(payload?.error?.message ?? "Could not start checkout.");
        }}
      >
        Complete payment
      </Button>
      {message ? <p className="text-sm text-alert">{message}</p> : null}
    </div>
  );
}
