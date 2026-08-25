"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import type { ReceiptCenterFilters } from "@/lib/receipts/list";
import { receiptFiltersAreActive } from "@/lib/receipts/list";
import { receiptStatusLabel } from "@/lib/receipts/states";
import { RECEIPT_STATUSES } from "@/types/domain";

const selectClass =
  "h-11 w-full rounded-md border border-steel/50 bg-white px-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-route";

export function ReceiptFilterForm({
  filters,
  trucks,
  drivers,
}: {
  filters: ReceiptCenterFilters;
  trucks: Array<{ id: string; unit_number: string }>;
  drivers: Array<{ id: string; full_name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const active = receiptFiltersAreActive(filters);
  const summary = [
    filters.q,
    filters.status,
    filters.region,
    filters.from || filters.to ? `${filters.from || "…"} to ${filters.to || "…"}` : null,
    filters.truckId ? trucks.find((truck) => truck.id === filters.truckId)?.unit_number : null,
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
            {filters.sort && filters.sort !== "purchased_at" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
            {filters.dir === "asc" ? <input type="hidden" name="dir" value="asc" /> : null}
            <div className="md:col-span-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="Merchant, city, or receipt #" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={filters.status ?? ""} className={selectClass}>
                <option value="">All</option>
                {RECEIPT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {receiptStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="truckId">Truck</Label>
              <select id="truckId" name="truckId" defaultValue={filters.truckId ?? ""} className={selectClass}>
                <option value="">All</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.unit_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="driverId">Driver</Label>
              <select id="driverId" name="driverId" defaultValue={filters.driverId ?? ""} className={selectClass}>
                <option value="">All</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="region">State</Label>
              <Input id="region" name="region" maxLength={2} defaultValue={filters.region ?? ""} placeholder="TX" />
            </div>
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" type="date" defaultValue={filters.from ?? ""} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="date" defaultValue={filters.to ?? ""} />
            </div>
            <div>
              <Label htmlFor="ocr">OCR</Label>
              <select id="ocr" name="ocr" defaultValue={filters.ocr ?? ""} className={selectClass}>
                <option value="">Any</option>
                <option value="low">Low confidence</option>
                <option value="ok">OK</option>
              </select>
            </div>
            <div>
              <Label htmlFor="report">Report</Label>
              <select id="report" name="report" defaultValue={filters.report ?? ""} className={selectClass}>
                <option value="">Any</option>
                <option value="unreported">Unreported</option>
                <option value="reported">Included in a report</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="primary" className="w-full">
                Apply filters
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
