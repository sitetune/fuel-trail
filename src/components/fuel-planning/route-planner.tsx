"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function RoutePlanner({
  trucks,
}: {
  trucks: Array<{ id: string; unit_number: string }>;
}) {
  const [result, setResult] = useState<string>("");
  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const response = await fetch("/api/routes/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              truckId: form.get("truckId"),
              originText: form.get("originText"),
              destinationText: form.get("destinationText"),
              originLat: form.get("originLat") ? Number(form.get("originLat")) : undefined,
              originLng: form.get("originLng") ? Number(form.get("originLng")) : undefined,
              destinationLat: form.get("destinationLat") ? Number(form.get("destinationLat")) : undefined,
              destinationLng: form.get("destinationLng") ? Number(form.get("destinationLng")) : undefined,
              currentEstimatedGallons: form.get("currentEstimatedGallons")
                ? Number(form.get("currentEstimatedGallons"))
                : undefined,
              trailerAttached: form.get("trailerAttached") === "on",
              issueToDriver: form.get("issueToDriver") === "on",
            }),
          });
          const json = await response.json();
          if (!response.ok) {
            setResult(json.error?.message ?? "Planning failed");
            return;
          }
          const rec = json.data.recommendation;
          const notices = (json.data.notices as string[] | undefined)?.join(" ") ?? "";
          setResult(
            rec
              ? `${rec.explanation} ${rec.assumptions?.length ? `Assumptions: ${rec.assumptions.join(" ")}` : ""} ${notices}`
              : `No priced truck-accessible stop ranked. ${notices}`,
          );
        }}
      >
        <Label htmlFor="truckId">Truck</Label>
        <select id="truckId" name="truckId" className="h-11 w-full rounded-md border px-3" required>
          {trucks.map((truck) => (
            <option key={truck.id} value={truck.id}>
              {truck.unit_number}
            </option>
          ))}
        </select>
        <Label htmlFor="originText">Origin</Label>
        <Input id="originText" name="originText" defaultValue="Baytown, TX" required />
        <Label htmlFor="destinationText">Destination</Label>
        <Input id="destinationText" name="destinationText" defaultValue="Conroe, TX" required />
        <div className="grid grid-cols-2 gap-2">
          <Input name="originLat" placeholder="Origin lat" defaultValue="29.7355" />
          <Input name="originLng" placeholder="Origin lng" defaultValue="-94.9774" />
          <Input name="destinationLat" placeholder="Dest lat" defaultValue="30.3119" />
          <Input name="destinationLng" placeholder="Dest lng" defaultValue="-95.4561" />
        </div>
        <Input name="currentEstimatedGallons" placeholder="Estimated gallons override" />
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="trailerAttached" defaultChecked className="h-5 w-5" />
          Trailer attached
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="issueToDriver" className="h-5 w-5" />
          Issue to driver
        </label>
        <Button type="submit" variant="amber" className="w-full">
          Rank fuel stops
        </Button>
      </form>
      {result ? <p className="mt-4 text-sm leading-6">{result}</p> : null}
    </Card>
  );
}
