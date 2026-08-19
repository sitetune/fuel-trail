import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink text-balance">{title}</h1>
        {description ? <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-steel/25 bg-white p-4 shadow-[0_8px_24px_rgba(11,23,40,0.06)]",
      )}
    >
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint ? <div className="mt-1 text-xs font-medium">{hint}</div> : null}
    </div>
  );
}
