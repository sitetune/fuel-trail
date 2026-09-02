"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResumeCheckoutButton({
  plan,
  period,
  label = "Complete payment",
  variant = "primary",
}: {
  plan?: string;
  period?: string;
  label?: string;
  variant?: "primary" | "outline";
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        onClick={async () => {
          setMessage("");
          const response = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, period }),
          });
          const payload = (await response.json().catch(() => null)) as
            | { data?: { url?: string; updated?: boolean }; error?: { message?: string } }
            | null;
          if (payload && "data" in payload && payload.data?.updated) {
            window.location.href = "/manage/billing?billing=ok";
            return;
          }
          if (payload && "data" in payload && payload.data?.url) {
            window.location.href = payload.data.url;
            return;
          }
          setMessage(payload?.error?.message ?? "Could not start checkout.");
        }}
      >
        {label}
      </Button>
      {message ? <p className="text-sm text-alert">{message}</p> : null}
    </div>
  );
}
