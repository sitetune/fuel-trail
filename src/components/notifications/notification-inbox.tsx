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
      {rows.map((row) => (
        <Card key={row.id} className={row.read_at ? "opacity-70" : ""}>
          <p className="font-semibold">{row.title}</p>
          <p className="text-sm text-muted">{row.body}</p>
          <p className="mt-1 text-xs text-muted">{new Date(row.created_at).toLocaleString()}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {row.href ? (
              <Button asChild size="sm" variant="primary">
                <Link href={row.href}>Open</Link>
              </Button>
            ) : null}
            {!row.read_at ? (
              <Button type="button" size="sm" variant="outline" onClick={() => mark([row.id])}>
                Mark read
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
