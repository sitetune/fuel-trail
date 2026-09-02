"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#resources", label: "Resources" },
];

export function HomeHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <BrandLockup tone="dark" showWordmark={false} className="sm:hidden text-white" />
        <BrandLockup tone="dark" className="hidden sm:flex text-white" />
        <nav className="hidden flex-1 items-center gap-7 lg:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-warm/90 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/login" className="px-2 py-2 text-sm font-medium text-warm/90 hover:text-white">
            Sign in
          </Link>
          <Button asChild variant="primary" className="h-10 min-h-10 px-3 sm:px-4">
            <Link href="/signup?plan=growth">Get started</Link>
          </Button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-4 pb-4 lg:hidden" aria-label="Mobile">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center text-sm font-medium text-warm/90 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
