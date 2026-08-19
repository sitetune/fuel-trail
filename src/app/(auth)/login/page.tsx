import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { signInAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Use your FuelTrail email and password.</p>
      </div>
      <form action={signInAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <FieldError
          message={
            params.error === "invalid"
              ? "Email or password is incorrect."
              : params.error === "inactive"
                ? "This account is deactivated."
                : undefined
          }
        />
        <Button type="submit" variant="primary" className="w-full" size="lg">
          Sign in
        </Button>
      </form>
      <div className="flex flex-col gap-2 text-sm">
        <Link className="font-medium text-route" href="/signup">
          Create a company account
        </Link>
        <Link className="text-muted" href="/reset-password">
          Forgot password
        </Link>
      </div>
    </Card>
  );
}
