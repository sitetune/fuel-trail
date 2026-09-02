"use client";

import { useState } from "react";
import { updateOwnProfileAction } from "@/app/(account)/profile-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function ProfileForm({
  fullName,
  phone,
  email,
  emailPending,
  error,
}: {
  fullName: string;
  phone: string | null;
  email: string;
  emailPending?: string | null;
  error?: string;
}) {
  const [message] = useState(error ?? "");
  return (
    <Card className="max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted">Name and phone save immediately. Email changes wait for confirmation.</p>
      </div>
      {message ? <p className="text-sm text-alert">{message}</p> : null}
      {emailPending ? (
        <p className="text-sm text-route">A confirmation was sent to {emailPending}. Your login email stays {email} until you confirm.</p>
      ) : null}
      <form action={updateOwnProfileAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Name</Label>
          <Input id="full_name" name="full_name" defaultValue={fullName} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={email} required />
        </div>
        <Button type="submit" variant="primary">
          Save profile
        </Button>
      </form>
    </Card>
  );
}
