"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { FuelStopMap } from "@/components/fuel-planning/fuel-stop-map";
import { RoutePlanner } from "@/components/fuel-planning/route-planner";
import { IssuePlanButton } from "@/components/fuel-planning/issue-plan-button";
import { formatUsd } from "@/lib/utils";
import type { MappedFuelStop } from "@/lib/routing/osm-stops";

type Place = { name: string; lat: number; lng: number };

const DEFAULT_ORIGIN: Place = { name: "Baytown, TX", lat: 29.7355, lng: -94.9774 };
const DEFAULT_DEST: Place = { name: "Conroe, TX", lat: 30.3119, lng: -95.4561 };

export function FuelStopsWorkspace({
  trucks,
  assignedTruckIds,
  plans,
  canIssue,
}: {
  trucks: Array<{ id: string; unit_number: string }>;
  assignedTruckIds: string[];
  canIssue: boolean;
  plans: Array<{
    id: string;
    truck_id: string;
    status: string;
    origin_text: string;
    destination_text: string;
    recommended_purchase_gallons: number | string | null;
    driver_id: string | null;
    trucks: { unit_number: string } | null;
    fuel_stations: { name?: string } | null;
  }>;
}) {
  const [query, setQuery] = useState("Baytown, TX");
  const [truckOnly, setTruckOnly] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Search a city or click the map. Pump prices come from your imports when we can match a stop.",
  );
  const [center, setCenter] = useState(DEFAULT_ORIGIN);
  const [stops, setStops] = useState<MappedFuelStop[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pick, setPick] = useState<"origin" | "destination">("origin");
  const [origin, setOrigin] = useState<Place>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<Place>(DEFAULT_DEST);

  async function search(params: { q?: string; lat?: number; lng?: number }) {
    setBusy(true);
    const url = new URL("/api/fuel-stops/search", window.location.origin);
    if (params.q) url.searchParams.set("q", params.q);
    if (params.lat != null) url.searchParams.set("lat", String(params.lat));
    if (params.lng != null) url.searchParams.set("lng", String(params.lng));
    url.searchParams.set("truckOnly", truckOnly ? "1" : "0");
    const response = await fetch(url);
    const json = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(json.error?.message ?? "Search failed.");
      return;
    }
    const nextCenter = json.data.center as { lat: number; lng: number; label: string };
    setCenter({ name: nextCenter.label, lat: nextCenter.lat, lng: nextCenter.lng });
    setStops(json.data.stops as MappedFuelStop[]);
    const extra = [json.data.notice, json.data.priceSource].filter(Boolean).join(" ");
    setMessage(extra);
  }

  const applyStop = useCallback((stop: MappedFuelStop) => {
    setSelectedId(stop.id);
    const place = { name: stop.name, lat: stop.lat, lng: stop.lng };
    if (pick === "origin") setOrigin(place);
    else setDestination(place);
  }, [pick]);

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <form
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void search({ q: query });
          }}
        >
          <div className="min-w-0 flex-1">
            <Label htmlFor="stopQuery">Find truck stops and fuel stations</Label>
            <Input
              id="stopQuery"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="City, highway, or landmark"
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={truckOnly}
              onChange={(event) => setTruckOnly(event.target.checked)}
            />
            Truck-friendly first
          </label>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Searching…" : "Search map"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={pick === "origin" ? "primary" : "outline"} onClick={() => setPick("origin")}>
            Click sets origin
          </Button>
          <Button
            type="button"
            size="sm"
            variant={pick === "destination" ? "primary" : "outline"}
            onClick={() => setPick("destination")}
          >
            Click sets destination
          </Button>
        </div>
        <p className="text-sm text-muted">{message}</p>
        <FuelStopMap
          center={center}
          stops={stops}
          selectedId={selectedId}
          onSelect={applyStop}
          onMapClick={(lat, lng) => void search({ lat, lng })}
        />
        <div className="max-h-64 overflow-auto rounded-lg border border-steel/25">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-steel/30 text-muted">
                <th className="px-3 py-2 font-medium">Stop</th>
                <th className="px-3 py-2 font-medium">Miles</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Use</th>
              </tr>
            </thead>
            <tbody>
              {stops.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-muted" colSpan={4}>
                    Search to load OpenStreetMap truck stops around that place.
                  </td>
                </tr>
              ) : null}
              {stops.map((stop) => (
                <tr key={stop.id} className="border-b border-steel/20 last:border-b-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{stop.name}</p>
                    <p className="text-xs text-muted">
                      {[stop.city, stop.region].filter(Boolean).join(", ") || stop.source}
                      {stop.truckFriendly ? " · truck" : ""}
                      {stop.diesel ? " · diesel" : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{stop.miles == null ? "—" : stop.miles.toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums">{stop.price == null ? "—" : `${formatUsd(stop.price)}/gal`}</td>
                  <td className="px-3 py-2">
                    <Button type="button" variant="ghost" className="h-9 min-h-9 px-2" onClick={() => applyStop(stop)}>
                      Use as {pick}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Send a stop to a driver</h2>
          <RoutePlanner trucks={trucks} assignedTruckIds={assignedTruckIds} origin={origin} destination={destination} />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Recent plans</h2>
          {plans.length === 0 ? <Card>No plans yet. Rank a stop to create one.</Card> : null}
          {plans.map((plan) => (
            <Card key={plan.id}>
              <p className="font-medium">
                Unit {plan.trucks?.unit_number} · {plan.status}
              </p>
              <p className="text-sm text-muted">
                {plan.origin_text} → {plan.destination_text}
              </p>
              <p className="text-sm">
                {plan.fuel_stations?.name ?? "No priced stop ranked"}
                {plan.recommended_purchase_gallons != null ? ` · buy ${plan.recommended_purchase_gallons} gal` : ""}
              </p>
              {canIssue ? (
                <IssuePlanButton
                  planId={plan.id}
                  issued={plan.status === "issued"}
                  canIssue={assignedTruckIds.includes(plan.truck_id) || Boolean(plan.driver_id)}
                />
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
