"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-[#5E6B75]">{error.message}</p>
      <button className="mt-4 min-h-11 rounded-md bg-[#0B1F33] px-4 text-white" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
