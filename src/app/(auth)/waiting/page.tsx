import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export default function WaitingPage() {
  return (
    <Card className="space-y-5 p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Waiting for activation</h1>
      <p className="text-sm leading-relaxed text-muted">
        Your company account was created. A FuelTrail administrator still needs to activate it for this pilot.
      </p>
      <SignOutButton />
      <Button asChild variant="outline" className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </Card>
  );
}
