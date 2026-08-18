import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { updatePasswordAction } from "../actions";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <BrandLockup />
      <Card className="mt-8 space-y-4">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <form action={updatePasswordAction} className="space-y-3">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
          <FieldError message={params.error ? "Could not update password." : undefined} />
          <Button type="submit" variant="amber" className="w-full">
            Save password
          </Button>
        </form>
      </Card>
    </main>
  );
}
