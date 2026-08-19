import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <BrandLockup />
      <Card className="mt-8 space-y-4">
        <h1 className="text-2xl font-semibold">Create your company</h1>
        <p className="text-sm text-[#5E6B75]">
          FuelTrail can activate pilot companies immediately. Phase 3 will add billing at this step.
        </p>
        <form action={signUpAction} className="space-y-3">
          <div>
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div>
            <Label htmlFor="fullName">Your name</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div>
            <Label htmlFor="email">Work email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          </div>
          <div>
            <Label htmlFor="baseJurisdiction">Base state (optional)</Label>
            <Input id="baseJurisdiction" name="baseJurisdiction" maxLength={2} placeholder="TX" />
          </div>
          <FieldError message={message} />
          <Button type="submit" variant="amber" className="w-full" size="lg">
            Create company
          </Button>
        </form>
        <Link className="text-sm underline" href="/login">
          Already have an account? Sign in
        </Link>
      </Card>
    </main>
  );
}
