"use client";

import { useState } from "react";
import { toggleUserActiveAction } from "@/app/(management)/manage/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function UsersManager({
  users,
  trucks,
  canInvite,
  error,
}: {
  users: Array<{ id: string; full_name: string; email: string; role: string; is_active: boolean }>;
  trucks: Array<{ id: string; unit_number: string }>;
  canInvite: boolean;
  error?: string;
}) {
  const [message, setMessage] = useState(error ?? "");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Users</h1>
        {users.map((person) => (
          <Card key={person.id} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{person.full_name}</p>
              <p className="text-sm text-[#5E6B75]">
                {person.email} · {person.role} · {person.is_active ? "active" : "deactivated"}
              </p>
            </div>
            {canInvite ? (
              <form action={toggleUserActiveAction}>
                <input type="hidden" name="id" value={person.id} />
                <input type="hidden" name="is_active" value={person.is_active ? "false" : "true"} />
                <Button type="submit" variant="outline" size="sm">
                  {person.is_active ? "Deactivate" : "Activate"}
                </Button>
              </form>
            ) : null}
          </Card>
        ))}
      </div>
      {canInvite ? (
        <Card>
          <h2 className="mb-3 font-semibold">Invite user</h2>
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const response = await fetch("/api/admin/invite-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: form.get("email"),
                  fullName: form.get("fullName"),
                  role: form.get("role"),
                  truckId: form.get("truckId") || undefined,
                }),
              });
              setMessage(response.ok ? "Invite sent." : "Invite failed.");
            }}
          >
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" name="fullName" required />
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            <Label htmlFor="role">Role</Label>
            <select id="role" name="role" className="h-11 w-full rounded-md border px-3">
              <option value="driver">driver</option>
              <option value="manager">manager</option>
              <option value="owner_admin">owner_admin</option>
            </select>
            <Label htmlFor="truckId">Assign truck (drivers)</Label>
            <select id="truckId" name="truckId" className="h-11 w-full rounded-md border px-3">
              <option value="">None</option>
              {trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.unit_number}
                </option>
              ))}
            </select>
            <Button type="submit" variant="amber" className="w-full">
              Send invite
            </Button>
            {message ? <p className="text-sm">{message}</p> : null}
          </form>
        </Card>
      ) : (
        <p className="text-sm text-[#5E6B75]">Only the owner can invite or deactivate users.</p>
      )}
    </div>
  );
}
