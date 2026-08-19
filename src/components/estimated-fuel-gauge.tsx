import type { EstimateConfidence } from "@/types/domain";
import { formatGallons, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function EstimatedFuelGauge({
  gallons,
  capacity,
  confidence,
  calculatedAt,
  reserveGallons,
  weekStartMinGallons,
  size = "md",
}: {
  gallons: number | null;
  capacity: number;
  confidence: EstimateConfidence;
  calculatedAt: string | null;
  reserveGallons: number;
  weekStartMinGallons: number;
  size?: "sm" | "md" | "lg";
}) {
  const percent = gallons === null ? null : Math.max(0, Math.min(100, (gallons / capacity) * 100));
  const belowReserve = gallons !== null && gallons < reserveGallons;
  const belowMonday = gallons !== null && gallons < weekStartMinGallons;
  const height = size === "lg" ? "h-6" : size === "sm" ? "h-3" : "h-4";

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Estimated fuel</p>
        <p className="text-xs font-medium tracking-wide text-muted">{confidence} confidence</p>
      </div>
      <div className={cn("w-full overflow-hidden rounded-full bg-steel/30", height)} aria-hidden="true">
        <div
          className={cn(
            "h-full rounded-full",
            belowReserve ? "bg-alert" : belowMonday ? "bg-route" : "bg-success",
          )}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
      <p className="font-display text-lg font-semibold tabular-nums text-ink">
        {gallons === null ? "Unknown" : `${formatGallons(gallons)} (${formatPercent(percent)})`}
        <span className="ml-2 text-sm font-normal text-muted">of {formatGallons(capacity, 0)}</span>
      </p>
      <p className="text-xs text-muted">
        Calculated estimate, not a live tank sensor.
        {calculatedAt ? ` Last updated ${new Date(calculatedAt).toLocaleString()}.` : " No estimate yet."}
      </p>
      {belowReserve ? (
        <p className="text-sm font-medium text-alert">Below reserve ({formatGallons(reserveGallons, 0)}).</p>
      ) : null}
      {belowMonday ? (
        <p className="text-sm font-medium text-ink">
          Below Monday / start-of-week minimum ({formatGallons(weekStartMinGallons, 0)}).
        </p>
      ) : null}
    </div>
  );
}
