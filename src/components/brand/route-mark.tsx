import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function RouteMark({
  size = 32,
  tone = "light",
  className,
}: {
  size?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  const ink = tone === "dark" ? "#FFFFFF" : brand.colors.ink;
  const route = brand.colors.route;
  const dash = tone === "dark" ? brand.colors.ink : "#FFFFFF";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path d="M4.5 5.5h13.2c.5 0 .8.5.6 1l-1.4 4.2H3.7L4.5 5.5Z" fill={ink} />
      <path d="M18.2 5.5H27c.6 0 1 .6.8 1.1L26.2 11h-9.4l1.4-5.5Z" fill={route} />
      <path d="M3.5 12.4h15.4c.5 0 .8.5.6 1l-1.3 3.8H2.8l.7-4.8Z" fill={route} />
      <path d="M2.6 18.4h6.2l-1.8 8.8H1.2l1.4-8.8Z" fill={ink} />
      <path d="M7.6 23.2h21.2c.5 0 .8.5.6 1l-1.5 4.4H6.4l1.2-5.4Z" fill={ink} />
      <path
        d="M8.4 26.1h18.6"
        fill="none"
        stroke={dash}
        strokeWidth="1.15"
        strokeDasharray="2.1 1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandWordmark({
  tone = "light",
  showTagline = false,
}: {
  tone?: "light" | "dark";
  showTagline?: boolean;
}) {
  const fuel = tone === "dark" ? "text-white" : "text-ink";
  return (
    <span className="flex flex-col leading-tight">
      <span className="font-display text-base font-semibold tracking-tight">
        <span className={fuel}>Fuel</span>
        <span className="text-route">Trail</span>
      </span>
      {showTagline ? (
        <span className={cn("text-[11px] font-medium", tone === "dark" ? "text-steel" : "text-muted")}>
          {brand.tagline}
        </span>
      ) : null}
    </span>
  );
}
