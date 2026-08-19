"use client";

import { upsertTruckAction } from "@/app/(management)/manage/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export function TruckForm({
  truck,
}: {
  truck?: {
    id: string;
    unit_number: string;
    vin: string | null;
    license_plate: string | null;
    license_state?: string | null;
    year?: number | null;
    make?: string | null;
    model?: string | null;
    fuel_type?: string | null;
    notes?: string | null;
    tank_capacity_gallons: number;
    target_mpg: number;
    week_start_min_gallons: number;
    reserve_gallons: number;
    status: string;
  };
}) {
  return (
    <Card>
      <form action={upsertTruckAction} className="space-y-3">
        {truck ? <input type="hidden" name="id" value={truck.id} /> : null}
        <Label htmlFor="unit_number">Unit number</Label>
        <Input id="unit_number" name="unit_number" required defaultValue={truck?.unit_number} />
        <Label htmlFor="vin">VIN</Label>
        <Input id="vin" name="vin" defaultValue={truck?.vin ?? ""} />
        <Label htmlFor="license_plate">License plate</Label>
        <Input id="license_plate" name="license_plate" defaultValue={truck?.license_plate ?? ""} />
        <Label htmlFor="license_state">Plate state</Label>
        <Input id="license_state" name="license_state" defaultValue={truck?.license_state ?? ""} maxLength={2} />
        <Label htmlFor="year">Year</Label>
        <Input id="year" name="year" type="number" defaultValue={truck?.year ?? ""} />
        <Label htmlFor="make">Make</Label>
        <Input id="make" name="make" defaultValue={truck?.make ?? ""} />
        <Label htmlFor="model">Model</Label>
        <Input id="model" name="model" defaultValue={truck?.model ?? ""} />
        <Label htmlFor="fuel_type">Fuel type</Label>
        <Input id="fuel_type" name="fuel_type" defaultValue={truck?.fuel_type ?? "diesel"} />
        <Label htmlFor="tank_capacity_gallons">Tank capacity (gal)</Label>
        <Input id="tank_capacity_gallons" name="tank_capacity_gallons" type="number" step="0.1" defaultValue={truck?.tank_capacity_gallons ?? 200} />
        <Label htmlFor="target_mpg">Target MPG</Label>
        <Input id="target_mpg" name="target_mpg" type="number" step="0.1" defaultValue={truck?.target_mpg ?? 6.5} />
        <Label htmlFor="week_start_min_gallons">Monday minimum (gal)</Label>
        <Input id="week_start_min_gallons" name="week_start_min_gallons" type="number" defaultValue={truck?.week_start_min_gallons ?? 100} />
        <Label htmlFor="reserve_gallons">Reserve (gal)</Label>
        <Input id="reserve_gallons" name="reserve_gallons" type="number" defaultValue={truck?.reserve_gallons ?? 25} />
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" className="h-11 w-full rounded-md border px-3" defaultValue={truck?.status ?? "active"}>
          <option value="active">active</option>
          <option value="maintenance">maintenance</option>
          <option value="inactive">inactive</option>
        </select>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" defaultValue={truck?.notes ?? ""} />
        <Button type="submit" variant="amber" className="w-full">
          Save truck
        </Button>
      </form>
    </Card>
  );
}
