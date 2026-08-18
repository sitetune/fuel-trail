import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { resetPasswordAction } from "../actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <BrandLockup />
      <Card className="mt-8 space-y-4">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        {params.sent ? (
          <p>If that email exists, a reset link is on its way.</p>
        ) : (
          <form action={resetPasswordAction} className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
            <Button type="submit" variant="amber" className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
