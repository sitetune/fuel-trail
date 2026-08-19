"use client";

import { useState } from "react";
import { assignDriverAction, toggleUserActiveAction, updateUserAction } from "@/app/(management)/manage/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export type ManagedUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_seen_at: string | null;
  assigned_unit?: string | null;
  assigned_truck_id?: string | null;
  receipt_count?: number;
};

export function UsersManager({
  users,
  trucks,
  canInvite,
  canAssign,
  error,
}: {
  users: ManagedUser[];
  trucks: Array<{ id: string; unit_number: string }>;
  canInvite: boolean;
  canAssign?: boolean;
  error?: string;
}) {
  const [message, setMessage] = useState(error ?? "");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = users.filter((person) => {
    if (roleFilter !== "all" && person.role !== roleFilter) return false;
    if (statusFilter === "active" && !person.is_active) return false;
    if (statusFilter === "inactive" && person.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Users</h1>
        <p className="text-sm text-[#5E6B75]">Deactivate instead of deleting anyone with receipt history.</p>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <div className="flex flex-wrap gap-3">
        <select className="h-11 rounded-md border px-3" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">All roles</option>
          <option value="owner_admin">owner</option>
          <option value="manager">manager</option>
          <option value="auditor">auditor</option>
          <option value="driver">driver</option>
        </select>
        <select className="h-11 rounded-md border px-3" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">active</option>
          <option value="inactive">deactivated</option>
        </select>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {filtered.map((person) => (
            <Card key={person.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{person.full_name}</p>
                  <p className="text-sm text-[#5E6B75]">
                    {person.email} · {person.role}
                    {person.assigned_unit ? ` · Unit ${person.assigned_unit}` : ""}
                  </p>
                  <p className="text-xs text-[#5E6B75]">
                    Last seen {person.last_seen_at ? new Date(person.last_seen_at).toLocaleString() : "never"} ·{" "}
                    {person.receipt_count ?? 0} receipts
                  </p>
                </div>
                <Badge tone={person.is_active ? "success" : "neutral"}>{person.is_active ? "active" : "deactivated"}</Badge>
              </div>
              {canInvite ? (
                <form action={updateUserAction} className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="id" value={person.id} />
                  <Input name="full_name" defaultValue={person.full_name} aria-label="Name" />
                  <Input name="phone" defaultValue={person.phone ?? ""} placeholder="Phone" aria-label="Phone" />
                  <select name="role" className="h-11 rounded-md border px-3" defaultValue={person.role}>
                    <option value="driver">driver</option>
                    <option value="manager">manager</option>
                    <option value="auditor">auditor</option>
                    <option value="owner_admin">owner_admin</option>
                  </select>
                  <Button type="submit" variant="outline" size="sm">
                    Save profile
                  </Button>
                </form>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canInvite ? (
                  <form action={toggleUserActiveAction}>
                    <input type="hidden" name="id" value={person.id} />
                    <input type="hidden" name="is_active" value={person.is_active ? "false" : "true"} />
                    <Button type="submit" variant={person.is_active ? "danger" : "success"} size="sm">
                      {person.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                ) : null}
                {person.role === "driver" && (canAssign ?? canInvite) ? (
                  <form action={assignDriverAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="driverId" value={person.id} />
                    <input type="hidden" name="redirect" value="/manage/users" />
                    <select name="truckId" className="h-11 rounded-md border px-3" defaultValue={person.assigned_truck_id ?? ""} required>
                      <option value="" disabled>
                        Assign truck
                      </option>
                      {trucks.map((truck) => (
                        <option key={truck.id} value={truck.id}>
                          Unit {truck.unit_number}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Transfer assignment
                    </Button>
                  </form>
                ) : null}
                {canInvite ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const response = await fetch("/api/admin/invite-user", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: person.email,
                          fullName: person.full_name,
                          role: person.role,
                        }),
                      });
                      setMessage(response.ok ? `Invite resent to ${person.email}.` : "Could not resend invite.");
                    }}
                  >
                    Resend invite
                  </Button>
                ) : null}
              </div>
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
                <option value="auditor">auditor</option>
                <option value="owner_admin">owner_admin</option>
              </select>
              <Label htmlFor="truckId">Assign truck (drivers)</Label>
              <select id="truckId" name="truckId" className="h-11 w-full rounded-md border px-3">
                <option value="">None</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    Unit {truck.unit_number}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="amber" className="w-full">
                Send invite
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
