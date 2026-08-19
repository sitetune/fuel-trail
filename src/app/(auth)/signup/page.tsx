import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { signUpAction } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.error === "invalid"
      ? "Check the company name, email, and a password of at least 10 characters."
      : params.error === "rate"
        ? "Too many signups from this network. Try again in an hour."
        : params.error === "create"
          ? "Could not create the company. That email may already be in use."
          : undefined;
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Create your company</h1>
        <p className="mt-1 text-sm text-muted">
          Start a FuelTrail workspace for drivers, trucks, and receipt audit.
        </p>
      </div>
      <form action={signUpAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company name</Label>
          <Input id="companyName" name="companyName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Your name</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="baseJurisdiction">Base state (optional)</Label>
          <Input id="baseJurisdiction" name="baseJurisdiction" maxLength={2} />
        </div>
        <FieldError message={message} />
        <Button type="submit" variant="primary" className="w-full" size="lg">
          Create company
        </Button>
      </form>
      <Link className="text-sm font-medium text-route" href="/login">
        Already have an account? Sign in
      </Link>
    </Card>
  );
}
