import Link from "next/link";
import { BrandWordmark, RouteMark } from "@/components/brand/route-mark";
import { cn } from "@/lib/utils";

export function BrandMark({ size = 32, tone = "light" }: { size?: number; tone?: "light" | "dark" }) {
  return <RouteMark size={size} tone={tone} />;
}

export function BrandLockup({
  href = "/",
  logoUrl,
  tone = "light",
  showTagline = false,
  className,
}: {
  href?: string;
  logoUrl?: string | null;
  tone?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex min-h-11 items-center gap-2.5", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
      ) : (
        <RouteMark tone={tone} />
      )}
      <BrandWordmark tone={tone} showTagline={showTagline} />
    </Link>
  );
}
