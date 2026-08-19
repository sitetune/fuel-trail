"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main" className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
