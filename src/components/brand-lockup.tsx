import Link from "next/link";
import { brand } from "@/config/brand";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="8" fill="#0B1F33" />
      <path
        d="M6 22c6-1 8-8 10-8s4 7 10 8"
        fill="none"
        stroke="#F5A524"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 7c2.4 3.2 3.2 5.6 0 10-3.2-4.4-2.4-6.8 0-10z"
        fill="#F5A524"
      />
    </svg>
  );
}

export function BrandLockup({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 min-h-11">
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="font-semibold text-[#0B1F33]">{brand.name}</span>
        <span className="text-[11px] text-[#5E6B75]">{brand.tagline}</span>
      </span>
    </Link>
  );
}
