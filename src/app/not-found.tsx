import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-2 text-sm text-muted">That page or record is not available to this account.</p>
      <Button asChild className="mt-4" variant="primary">
        <Link href="/">Home</Link>
      </Button>
    </main>
  );
}
