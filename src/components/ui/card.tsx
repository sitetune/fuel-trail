import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-steel/25 bg-white p-4 shadow-[0_8px_24px_rgba(11,23,40,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "alert" | "amber" | "navy" | "route";
}) {
  const tones = {
    neutral: "bg-warm text-muted",
    success: "bg-success/10 text-success",
    alert: "bg-alert/10 text-alert",
    amber: "bg-route/10 text-route",
    route: "bg-route/10 text-route",
    navy: "bg-ink text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
