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

const ROLE_LABELS: Record<string, string> = {
  owner_admin: "Owner",
  manager: "Manager",
  auditor: "Auditor",
  driver: "Driver",
};

export function UsersManager({
  users,
  trucks,
  canInvite,
  canAssign,
  canEditAny,
  error,
}: {
  users: ManagedUser[];
  trucks: Array<{ id: string; unit_number: string }>;
  canInvite: boolean;
  canAssign?: boolean;
  canEditAny?: boolean;
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
  const inviteRoles = canEditAny
    ? [
        ["driver", "Driver"],
        ["manager", "Manager"],
        ["auditor", "Auditor"],
        ["owner_admin", "Owner"],
      ]
    : [["driver", "Driver"]];

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm">{message}</p> : null}
      {canInvite ? (
        <Card>
          <h2 className="mb-3 font-semibold">Invite user</h2>
          <p className="mb-3 text-sm text-muted">
            {canEditAny ? "Owners can invite any role." : "Managers can invite and deactivate drivers."}
          </p>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const response = await fetch("/api/admin/invite-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: form.get("email"),
                  fullName: form.get("fullName"),
                  role: form.get("role") || "driver",
                  truckId: form.get("truckId") || undefined,
                }),
              });
              const payload = (await response.json().catch(() => null)) as
                | { error?: { message?: string } }
                | { data?: unknown }
                | null;
              setMessage(
                response.ok
                  ? "Invite sent."
                  : payload && "error" in payload
                    ? (payload.error?.message ?? "Invite failed.")
                    : "Invite failed.",
              );
              if (response.ok) event.currentTarget.reset();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Name</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <select id="role" name="role" className="h-11 w-full rounded-md border px-3" defaultValue="driver">
                {inviteRoles.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="truckId">Assign truck (drivers)</Label>
              <select id="truckId" name="truckId" className="h-11 w-full rounded-md border px-3">
                <option value="">None</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    Unit {truck.unit_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary">
                Send invite
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <select className="h-11 rounded-md border px-3" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">All roles</option>
          <option value="owner_admin">Owner</option>
          <option value="manager">Manager</option>
          <option value="auditor">Auditor</option>
          <option value="driver">Driver</option>
        </select>
        <select className="h-11 rounded-md border px-3" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered.map((person) => {
          const canEditThis = canEditAny || (canInvite && person.role === "driver");
          return (
            <Card key={person.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{person.full_name}</p>
                  <p className="text-sm text-muted">
                    {person.email}
                    {person.assigned_unit ? ` · Unit ${person.assigned_unit}` : ""}
                    {` · ${person.receipt_count ?? 0} receipts`}
                  </p>
                  <p className="text-xs text-muted">
                    Last seen {person.last_seen_at ? new Date(person.last_seen_at).toLocaleString() : "never"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge tone="neutral">{ROLE_LABELS[person.role] ?? person.role}</Badge>
                  <Badge tone={person.is_active ? "success" : "neutral"}>{person.is_active ? "Active" : "Deactivated"}</Badge>
                </div>
              </div>
              {canEditAny ? (
                <form action={updateUserAction} className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="id" value={person.id} />
                  <Input name="full_name" defaultValue={person.full_name} aria-label="Name" />
                  <Input name="phone" defaultValue={person.phone ?? ""} placeholder="Phone" aria-label="Phone" />
                  <select name="role" className="h-11 rounded-md border px-3" defaultValue={person.role}>
                    <option value="driver">Driver</option>
                    <option value="manager">Manager</option>
                    <option value="auditor">Auditor</option>
                    <option value="owner_admin">Owner</option>
                  </select>
                  <Button type="submit" variant="outline" size="sm">
                    Save profile
                  </Button>
                </form>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canEditThis ? (
                  <form action={toggleUserActiveAction}>
                    <input type="hidden" name="id" value={person.id} />
                    <input type="hidden" name="is_active" value={person.is_active ? "false" : "true"} />
                    <Button type="submit" variant={person.is_active ? "danger" : "success"} size="sm">
                      {person.is_active ? "Deactivate" : "Reactivate"}
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
          );
        })}
      </div>
    </div>
  );
}
