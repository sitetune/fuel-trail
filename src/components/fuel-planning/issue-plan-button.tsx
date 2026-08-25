"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function IssuePlanButton({
  planId,
  issued,
  canIssue,
}: {
  planId: string;
  issued: boolean;
  canIssue: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(issued);

  if (!canIssue) {
    return <p className="text-sm text-muted">Assign a driver to this truck to send a stop.</p>;
  }

  return (
    <div className="mt-3 space-y-1">
      <Button
        type="button"
        variant={sent ? "outline" : "primary"}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          const response = await fetch("/api/routes/issue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId }),
          });
          const json = await response.json();
          setBusy(false);
          if (!response.ok) {
            setMessage(json.error?.message ?? "Could not notify the driver.");
            return;
          }
          setSent(true);
          setMessage("Sent to the assigned driver.");
        }}
      >
        {sent ? "Send again" : "Send to driver"}
      </Button>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
