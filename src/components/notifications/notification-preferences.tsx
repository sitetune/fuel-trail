"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NOTIFICATION_EVENTS, type NotificationEvent } from "@/lib/notifications/events";

const LABELS: Record<NotificationEvent, string> = {
  receipt_uploaded: "Receipt uploaded",
  ocr_needs_review: "OCR needs review",
  ocr_low_confidence: "Low OCR confidence",
  receipt_submitted: "Receipt submitted",
  receipt_verified: "Receipt verified",
  receipt_rejected: "Receipt rejected",
  receipt_resubmitted: "Receipt resubmitted",
  receipt_image_replaced: "Receipt image replaced",
  possible_duplicate: "Possible duplicate",
  import_completed: "Import completed",
  import_failed: "Import failed",
  unreviewed_aging: "Unreviewed receipts aging",
  fuel_stop_issued: "Fuel-stop recommendation",
};

export function NotificationPreferences({
  emailEvents,
}: {
  emailEvents: Partial<Record<NotificationEvent, boolean>>;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({ ...emailEvents });
  const [message, setMessage] = useState("");

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">Email preferences</h2>
        <p className="text-sm text-muted">
          In-app alerts always appear. Email is sent only when a Resend key is configured and you check a box below.
        </p>
      </div>
      <form
        className="space-y-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const response = await fetch("/api/notifications/preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailEvents: selected }),
          });
          setMessage(response.ok ? "Preferences saved." : "Could not save preferences.");
        }}
      >
        {NOTIFICATION_EVENTS.map((event) => (
          <label key={event} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={Boolean(selected[event])}
              onChange={(change) => setSelected((current) => ({ ...current, [event]: change.target.checked }))}
            />
            {LABELS[event]}
          </label>
        ))}
        <Button type="submit" variant="outline">
          Save email preferences
        </Button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
    </Card>
  );
}
