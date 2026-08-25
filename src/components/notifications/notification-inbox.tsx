"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  event_type: string;
  entity_id?: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationInbox({ notifications }: { notifications: NotificationRow[] }) {
  const [rows, setRows] = useState(notifications);
  async function mark(ids?: string[]) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    setRows((current) =>
      current.map((row) =>
        !ids || ids.includes(row.id) ? { ...row, read_at: row.read_at ?? new Date().toISOString() } : row,
      ),
    );
  }
  if (rows.length === 0) {
    return <Card>No notifications yet.</Card>;
  }
  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={() => mark()}>
        Mark all as read
      </Button>
      {rows.map((row) => {
        const fuelStop = row.event_type === "fuel_stop_issued";
        const href = fuelStop && row.entity_id ? `/driver/fuel-stop/${row.entity_id}` : row.href;
        return (
          <Card
            key={row.id}
            className={fuelStop ? "border-route/40 bg-ink p-5 text-white" : row.read_at ? "opacity-70" : ""}
          >
            {fuelStop ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-sky">Assigned fuel stop</p>
            ) : null}
            <p className="font-semibold">{row.title}</p>
            <p className={fuelStop ? "text-sm text-steel" : "text-sm text-muted"}>{row.body}</p>
            <p className={fuelStop ? "mt-1 text-xs text-steel" : "mt-1 text-xs text-muted"}>
              {new Date(row.created_at).toLocaleString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {href ? (
                <Button asChild size={fuelStop ? "lg" : "sm"} variant="primary" className={fuelStop ? "w-full" : ""}>
                  <Link href={href}>{fuelStop ? "View stop & get directions" : "Open"}</Link>
                </Button>
              ) : null}
              {!row.read_at ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={fuelStop ? "w-full border-white/30 bg-transparent text-white hover:bg-white/10" : ""}
                  onClick={() => mark([row.id])}
                >
                  Mark read
                </Button>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
