"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, List, Receipt, Tray, X } from "@phosphor-icons/react";
import { BrandLockup } from "@/components/brand-lockup";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/driver", label: "Home", icon: House },
  { href: "/driver/receipts", label: "Receipts", icon: Receipt },
  { href: "/driver/queue", label: "Queue", icon: Tray },
  { href: "/driver/notifications", label: "Alerts", icon: Bell },
];

export function DriverHeader({
  logoUrl,
  unread,
}: {
  logoUrl?: string | null;
  unread: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-ink text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <BrandLockup href="/driver" logoUrl={logoUrl} tone="dark" />
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-2 pb-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href !== "/driver" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                  active ? "bg-white/10 text-white" : "text-steel hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon size={18} />
                {link.label}
                {link.href.endsWith("notifications") && unread > 0 ? (
                  <span className="ml-auto rounded-md bg-alert px-1.5 py-0.5 text-[11px] text-white">{unread > 99 ? "99+" : unread}</span>
                ) : null}
              </Link>
            );
          })}
          <div className="border-t border-white/10 px-2 py-2">
            <SignOutButton className="w-full justify-start text-white hover:bg-white/10 hover:text-white" />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
