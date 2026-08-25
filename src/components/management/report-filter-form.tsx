"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { ReportFilters } from "@/lib/reports/filters";
import { reportFiltersAreActive } from "@/lib/reports/filters";

export function ReportFilterForm({
  filters,
  trucks,
  drivers,
}: {
  filters: ReportFilters;
  trucks: Array<{ id: string; unit_number: string }>;
  drivers: Array<{ id: string; full_name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const active = reportFiltersAreActive(filters);
  const summary = [
    filters.from || filters.to ? `${filters.from || "…"} to ${filters.to || "…"}` : null,
    filters.truckId ? trucks.find((truck) => truck.id === filters.truckId)?.unit_number : null,
    filters.driverId ? drivers.find((driver) => driver.id === filters.driverId)?.full_name : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide filters" : "Filters"}
        </Button>
        {!open && active ? <p className="text-sm text-muted">{summary || "Filters applied"}</p> : null}
      </div>
      {open ? (
        <Card>
          <form className="grid gap-3 md:grid-cols-4" method="get">
            <input type="hidden" name="period" value={filters.period} />
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={filters.from ?? ""} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={filters.to ?? ""} />
            </div>
            <div>
              <Label htmlFor="truckId">Truck</Label>
              <select id="truckId" name="truckId" className="h-11 w-full rounded-md border px-3" defaultValue={filters.truckId ?? ""}>
                <option value="">All trucks</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    Unit {truck.unit_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="driverId">Driver</Label>
              <select id="driverId" name="driverId" className="h-11 w-full rounded-md border px-3" defaultValue={filters.driverId ?? ""}>
                <option value="">All drivers</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="merchant">Merchant</Label>
              <Input id="merchant" name="merchant" defaultValue={filters.merchant ?? ""} />
            </div>
            <div>
              <Label htmlFor="jurisdiction">State</Label>
              <Input id="jurisdiction" name="jurisdiction" defaultValue={filters.jurisdiction ?? ""} maxLength={2} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className="h-11 w-full rounded-md border px-3" defaultValue={filters.status ?? ""}>
                <option value="">Submitted + verified</option>
                <option value="verified">verified</option>
                <option value="submitted">submitted</option>
              </select>
            </div>
            <div>
              <Label htmlFor="report">Report membership</Label>
              <select id="report" name="report" className="h-11 w-full rounded-md border px-3" defaultValue={filters.report ?? ""}>
                <option value="">All</option>
                <option value="unreported">Unreported</option>
                <option value="reported">Already reported</option>
              </select>
            </div>
            <div>
              <Label htmlFor="fuelType">Fuel type</Label>
              <Input id="fuelType" name="fuelType" defaultValue={filters.fuelType ?? ""} placeholder="diesel" />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply filters</Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
