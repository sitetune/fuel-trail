import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export default function WaitingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <BrandLockup />
      <Card className="mt-8 space-y-4">
        <h1 className="text-2xl font-semibold">Waiting for activation</h1>
        <p className="text-sm text-[#5E6B75]">
          Your company account was created. A FuelTrail administrator still needs to activate it for this pilot.
        </p>
        <SignOutButton />
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </Card>
    </main>
  );
}
