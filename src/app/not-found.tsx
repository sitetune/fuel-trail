import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-[#5E6B75]">That page or record is not available to this account.</p>
      <Link className="mt-4 inline-flex min-h-11 items-center underline" href="/">
        Home
      </Link>
    </main>
  );
}
