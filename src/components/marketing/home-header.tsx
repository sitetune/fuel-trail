import Link from "next/link";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#resources", label: "Resources" },
];

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLockup tone="dark" showWordmark={false} className="sm:hidden text-white" />
        <BrandLockup tone="dark" className="hidden sm:flex text-white" />
        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex"
          aria-label="Primary"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-warm/90 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/login" className="px-2 py-2 text-sm font-medium text-warm/90 hover:text-white">
            Sign in
          </Link>
          <Button asChild variant="primary" className="h-10 min-h-10 px-3 sm:px-4">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
