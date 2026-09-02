import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function UpgradeNotice({ title = "Upgrade to continue", message }: { title?: string; message: string }) {
  return (
    <Card className="max-w-xl space-y-3">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <Button asChild variant="primary">
        <Link href="/#pricing">See plans</Link>
      </Button>
    </Card>
  );
}
