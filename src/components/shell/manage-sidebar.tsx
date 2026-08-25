"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartLine,
  FileText,
  GasPump,
  Gear,
  List,
  ListChecks,
  Receipt,
  Shield,
  SquaresFour,
  TrendDown,
  Truck,
  UploadSimple,
  Users,
  X,
} from "@phosphor-icons/react";
import { BrandLockup } from "@/components/brand-lockup";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

export type ManageNavLink = { href: string; label: string };

const ICONS: Record<string, typeof SquaresFour> = {
  "/manage": SquaresFour,
  "/manage/receipts": Receipt,
  "/manage/trucks": Truck,
  "/manage/reports": ChartLine,
  "/manage/savings": TrendDown,
  "/manage/import": UploadSimple,
  "/manage/setup": ListChecks,
  "/manage/routes": GasPump,
  "/manage/users": Users,
  "/manage/settings": Gear,
  "/manage/notifications": Bell,
  "/internal": Shield,
};

function isActive(pathname: string, href: string) {
  if (href === "/manage") return pathname === "/manage";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ManageSidebar({
  links,
  logoUrl,
  auditor,
  userLabel,
}: {
  links: ManageNavLink[];
  logoUrl?: string | null;
  auditor?: boolean;
  userLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = links.filter((link) =>
    ["/manage", "/manage/receipts", "/manage/trucks", "/manage/reports", "/manage/savings"].includes(link.href),
  );
  const operations = links.filter((link) => !primary.includes(link) && link.href !== "/internal");
  const admin = links.filter((link) => link.href === "/internal");

  const nav = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <BrandLockup href="/manage" logoUrl={logoUrl} />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <NavGroup title="Fleet" items={primary} pathname={pathname} onNavigate={() => setOpen(false)} />
        {operations.length ? (
          <NavGroup title="Operations" items={operations} pathname={pathname} onNavigate={() => setOpen(false)} />
        ) : null}
        {admin.length ? (
          <NavGroup title="Platform" items={admin} pathname={pathname} onNavigate={() => setOpen(false)} />
        ) : null}
      </nav>
      {auditor ? (
        <p className="px-4 pb-3 text-xs leading-relaxed text-muted">
          Read-only auditor access. You can review data but cannot change receipts, fleet, or settings.
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-steel/25 px-3 py-3">
        <p className="truncate text-xs font-medium text-muted">{userLabel}</p>
        <SignOutButton />
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-steel/25 bg-white px-4 lg:hidden">
        <BrandLockup href="/manage" logoUrl={logoUrl} />
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} weight="regular" /> : <List size={22} weight="regular" />}
        </button>
      </header>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-steel/25 bg-white transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {nav}
      </aside>
    </>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: ManageNavLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-steel">{title}</p>
      <ul className="space-y-0.5">
        {items.map((link) => {
          const Icon = ICONS[link.href] ?? FileText;
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                  active ? "bg-route/10 text-route" : "text-ink hover:bg-warm",
                )}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
