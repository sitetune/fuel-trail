import Link from "next/link";
import { FuelTrailMark } from "@/components/brand/fuel-trail-mark";
import { BrandWordmark } from "@/components/brand/route-mark";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function BrandMark({ size = 32, tone = "light" }: { size?: number; tone?: "light" | "dark" }) {
  return <FuelTrailMark size={size} tone={tone} />;
}

export function BrandLockup({
  href = "/",
  logoUrl,
  tone = "light",
  showTagline = false,
  showWordmark = true,
  className,
}: {
  href?: string;
  logoUrl?: string | null;
  tone?: "light" | "dark";
  showTagline?: boolean;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} aria-label={brand.name} className={cn("flex min-h-11 items-center gap-2.5", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
      ) : (
        <FuelTrailMark tone={tone} />
      )}
      {showWordmark ? <BrandWordmark tone={tone} showTagline={showTagline} /> : null}
    </Link>
  );
}
