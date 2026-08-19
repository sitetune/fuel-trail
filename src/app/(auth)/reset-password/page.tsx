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
    <Card className="space-y-5 p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Reset password</h1>
      {params.sent ? (
        <p className="text-sm text-muted">If that email exists, a reset link is on its way.</p>
      ) : (
        <form action={resetPasswordAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </Card>
  );
}
