"use client";

import { MapPin, NavigationArrow } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { buildMapsLinks } from "@/lib/routing/maps-links";
import { cn } from "@/lib/utils";

const APPS = [
  { id: "google" as const, label: "Google Maps" },
  { id: "apple" as const, label: "Apple Maps" },
  { id: "waze" as const, label: "Waze" },
];

export function DirectionsActions({
  lat,
  lng,
  label,
  tone = "light",
}: {
  lat: number;
  lng: number;
  label: string;
  tone?: "light" | "dark";
}) {
  const links = buildMapsLinks({ lat, lng, label });

  return (
    <div className="space-y-2">
      <Button asChild variant="primary" size="lg" className="w-full">
        <a href={links.google} rel="noreferrer">
          <NavigationArrow size={22} weight="bold" />
          Get directions
        </a>
      </Button>
      <div className="grid grid-cols-3 gap-2">
        {APPS.map((app) => (
          <a
            key={app.id}
            href={links[app.id]}
            rel="noreferrer"
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-lg border px-2 text-center text-xs font-semibold",
              tone === "dark"
                ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
                : "border-steel/60 bg-white text-ink hover:bg-warm",
            )}
          >
            {app.label}
          </a>
        ))}
      </div>
      <a
        href={links.geo}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold",
          tone === "dark" ? "text-sky" : "text-route",
        )}
      >
        <MapPin size={18} />
        Open in another maps app
      </a>
    </div>
  );
}
