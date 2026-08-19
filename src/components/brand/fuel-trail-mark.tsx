import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function FuelTrailMark({
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
      viewBox="0 0 136 136"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        fill={ink}
        d="M63.2,10.3h68.1l-13.9,32.3H49.7c0,0-6.4,0.1-8.9,0.5c-2,0.3-3.9,0.9-4.9,1.6c-2.8,1.9-3.5,4.2-3.5,4.2s7.5-20.6,11.4-30.9C47.2,9.1,53.1,10.7,63.2,10.3z"
      />
      <path
        fill={route}
        d="M49.1,48.8h66.1L101.3,81H38.9c0,0-7.7-0.1-12.9,1.8c-3.6,1.4-6.3,2.8-7.7,4.3C24,70,25.8,66.6,29.7,56.3C33.1,47.5,39,49.1,49.1,48.8z"
      />
      <path
        fill={ink}
        d="M49.7,86.9l-16.6,38.6l-28.4,0.2c0,0,6.4-17.3,10.2-27.7c3.1-8.6,15.3-10.7,24.3-11.1L49.7,86.9z"
      />
      <polygon fill={ink} points="65.3,97.8 50.8,97.8 55.4,86.9 70,86.9" />
      <polygon fill={ink} points="59.4,111.7 44.9,111.7 49.5,100.8 64.1,100.8" />
      <polygon fill={ink} points="53.5,125.7 39,125.7 43.6,114.7 58.2,114.7" />
      <ellipse cx="60.4" cy="92.4" rx="5.2" ry="2.15" fill={dash} transform="rotate(-22 60.4 92.4)" />
      <ellipse cx="54.6" cy="106.2" rx="4.8" ry="2" fill={dash} transform="rotate(-22 54.6 106.2)" />
      <ellipse cx="48.6" cy="120.2" rx="4.4" ry="1.85" fill={dash} transform="rotate(-22 48.6 120.2)" />
    </svg>
  );
}
