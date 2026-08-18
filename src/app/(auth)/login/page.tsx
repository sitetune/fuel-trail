import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <BrandLockup />
      <Card className="mt-8 space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <form action={signInAction} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
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
          <Button type="submit" variant="amber" className="w-full" size="lg">
            Sign in
          </Button>
        </form>
        <Link className="text-sm text-[#5E6B75] underline" href="/reset-password">
          Forgot password
        </Link>
      </Card>
    </main>
  );
}
