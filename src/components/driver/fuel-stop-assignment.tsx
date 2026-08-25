import Link from "next/link";
import { GasPump, MapPin } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { DirectionsActions } from "@/components/driver/directions-actions";
import { driverFuelStopHref, type DriverFuelStopView } from "@/lib/routing/driver-stop";
import { formatGallons, cn } from "@/lib/utils";

function trailerLabel(stop: DriverFuelStopView) {
  if (stop.trailerPolicy === "drop_required") return "Drop required before fueling";
  if (stop.trailerPolicy === "stay_attached" || stop.trailerAttached) return "Trailer can stay attached";
  return null;
}

function StopWhereabouts({ stop, tone }: { stop: DriverFuelStopView; tone: "dark" | "light" }) {
  const lines = [stop.addressLine, stop.highwayLine, stop.locality].filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className={cn("mt-2 flex items-start gap-2", tone === "dark" ? "text-white/85" : "text-ink")}>
      <MapPin size={18} className={cn("mt-0.5 shrink-0", tone === "dark" ? "text-sky" : "text-route")} />
      <div className="min-w-0 text-[15px] leading-snug">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export function FuelStopAssignment({
  stop,
  variant,
}: {
  stop: DriverFuelStopView;
  variant: "banner" | "page";
}) {
  const detailsHref = driverFuelStopHref(stop.planId);
  const gallons = stop.gallons != null ? formatGallons(stop.gallons, 0) : null;
  const trailer = trailerLabel(stop);

  if (variant === "banner") {
    return (
      <section className="space-y-4 rounded-xl bg-ink p-5 text-white shadow-[0_12px_32px_rgba(11,23,40,0.28)]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-route text-white">
            <GasPump size={28} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky">Assigned fuel stop</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-pretty">{stop.name}</h2>
            <StopWhereabouts stop={stop} tone="dark" />
          </div>
        </div>
        {gallons ? (
          <p className="font-display text-xl font-semibold tabular-nums">Buy {gallons}</p>
        ) : (
          <p className="text-sm text-steel">Fuel here if you need it. Manager did not set a gallon target.</p>
        )}
        <p className="text-sm text-steel">
          {stop.originText} → {stop.destinationText}
        </p>
        {stop.lat != null && stop.lng != null ? (
          <DirectionsActions lat={stop.lat} lng={stop.lng} label={stop.name} tone="dark" />
        ) : (
          <p className="text-sm text-steel">This stop has no map pin yet. Open details for the name and route.</p>
        )}
        <Button asChild variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10">
          <Link href={detailsHref}>Station details</Link>
        </Button>
        <p className="text-xs text-steel">You make the final safety decision.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-route">Assigned fuel stop</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-pretty">{stop.name}</h1>
        <StopWhereabouts stop={stop} tone="light" />
      </div>
      {gallons ? (
        <p className="font-display text-2xl font-semibold tabular-nums">Buy {gallons}</p>
      ) : null}
      <p className="text-sm text-muted">
        Route: {stop.originText} → {stop.destinationText}
      </p>
      {trailer ? <p className="text-sm font-medium">{trailer}</p> : null}
      {stop.parkingAvailable === "yes" ? (
        <p className="text-sm text-muted">Truck parking verified</p>
      ) : stop.parkingAvailable === "no" ? (
        <p className="text-sm text-alert">No truck parking on file</p>
      ) : null}
      {stop.truckAccess === "no" ? (
        <p className="text-sm text-alert">Marked as not truck-accessible. Confirm before you pull in.</p>
      ) : null}
      {stop.explanation ? <p className="text-sm">{stop.explanation}</p> : null}
      {stop.managerNotes ? <p className="text-sm text-muted">{stop.managerNotes}</p> : null}
      {stop.lat != null && stop.lng != null ? (
        <DirectionsActions lat={stop.lat} lng={stop.lng} label={stop.name} />
      ) : (
        <p className="text-sm text-muted">No coordinates are stored for this stop, so directions are unavailable.</p>
      )}
      <p className="text-sm text-muted">You make the final safety decision.</p>
    </div>
  );
}
