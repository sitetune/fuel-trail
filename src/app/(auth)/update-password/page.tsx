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
    <Card className="space-y-5 p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
      <form action={updatePasswordAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        <FieldError message={params.error ? "Could not update password." : undefined} />
        <Button type="submit" variant="primary" className="w-full">
          Save password
        </Button>
      </form>
    </Card>
  );
}
