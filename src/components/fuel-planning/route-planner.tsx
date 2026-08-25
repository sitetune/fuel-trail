"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { IssuePlanButton } from "@/components/fuel-planning/issue-plan-button";

export type PlannerPlace = { name: string; lat: number; lng: number };

export function RoutePlanner({
  trucks,
  assignedTruckIds,
  origin,
  destination,
}: {
  trucks: Array<{ id: string; unit_number: string }>;
  assignedTruckIds: string[];
  origin: PlannerPlace;
  destination: PlannerPlace;
}) {
  const [result, setResult] = useState<string>("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [truckId, setTruckId] = useState(trucks[0]?.id ?? "");
  const [issued, setIssued] = useState(false);
  const assigned = new Set(assignedTruckIds);
  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const selectedTruckId = String(form.get("truckId") ?? "");
          const issueNow = form.get("issueToDriver") === "on";
          setPlanId(null);
          setIssued(false);
          const response = await fetch("/api/routes/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              truckId: selectedTruckId,
              originText: form.get("originText"),
              destinationText: form.get("destinationText"),
              originLat: origin.lat,
              originLng: origin.lng,
              destinationLat: destination.lat,
              destinationLng: destination.lng,
              currentEstimatedGallons: form.get("currentEstimatedGallons")
                ? Number(form.get("currentEstimatedGallons"))
                : undefined,
              trailerAttached: form.get("trailerAttached") === "on",
              issueToDriver: issueNow,
            }),
          });
          const json = await response.json();
          if (!response.ok) {
            setResult(json.error?.message ?? "Planning failed");
            return;
          }
          const rec = json.data.recommendation;
          const notices = (json.data.notices as string[] | undefined)?.join(" ") ?? "";
          setTruckId(selectedTruckId);
          setPlanId(json.data.planId ?? null);
          setIssued(Boolean(json.data.issued));
          setResult(
            rec
              ? `${rec.explanation} ${rec.assumptions?.length ? `Assumptions: ${rec.assumptions.join(" ")}` : ""} ${notices}`
              : `No priced truck-accessible stop ranked. ${notices}`,
          );
        }}
      >
        <Label htmlFor="truckId">Truck</Label>
        <select
          id="truckId"
          name="truckId"
          className="h-11 w-full rounded-md border border-steel/50 bg-white px-3"
          required
          defaultValue={truckId}
        >
          {trucks.map((truck) => (
            <option key={truck.id} value={truck.id}>
              {truck.unit_number}
            </option>
          ))}
        </select>
        <Label htmlFor="originText">Origin</Label>
        <Input id="originText" name="originText" value={origin.name} readOnly />
        <Label htmlFor="destinationText">Destination</Label>
        <Input id="destinationText" name="destinationText" value={destination.name} readOnly />
        <p className="text-xs text-muted">
          Pick both points on the map. Ranking still uses your imported station prices when a stop matches.
        </p>
        <Input name="currentEstimatedGallons" placeholder="Estimated gallons override" />
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="trailerAttached" defaultChecked className="h-5 w-5" />
          Trailer attached
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="issueToDriver" className="h-5 w-5" />
          Send a fuel-stop notification to the assigned driver
        </label>
        <Button type="submit" variant="primary" className="w-full">
          Rank fuel stops
        </Button>
      </form>
      {result ? <p className="mt-4 text-sm leading-6">{result}</p> : null}
      {planId ? <IssuePlanButton planId={planId} issued={issued} canIssue={assigned.has(truckId)} /> : null}
    </Card>
  );
}
