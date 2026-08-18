"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FUEL_PRICE_CSV_HEADERS } from "@/lib/reports/csv";

const template = `${FUEL_PRICE_CSV_HEADERS.join(",")}
Pilot Travel Center,550 Interstate 10,Baytown,TX,77521,29.7355,-94.9774,3.459,diesel,2026-08-01T12:00:00Z,yes,yes,stay_attached,,
Car-only station,100 Main St,Houston,TX,77002,29.7604,-95.3698,3.199,diesel,2026-08-01T12:00:00Z,no,no,unknown,,
Drop-required yard,200 Industrial,Conroe,TX,77301,30.3119,-95.4561,3.399,diesel,2026-08-01T12:00:00Z,yes,yes,drop_required,Unverified lot,
`;

export function PriceImportForm() {
  const [message, setMessage] = useState("");
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Import station prices</h2>
      <a
        className="inline-flex min-h-11 items-center underline"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}
        download="fueltrail-price-template.csv"
      >
        Download CSV template
      </a>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const commit = (form.elements.namedItem("commit") as HTMLInputElement).checked;
          const data = new FormData(form);
          data.set("commit", commit ? "true" : "false");
          const response = await fetch("/api/imports/fuel-prices", { method: "POST", body: data });
          const json = await response.json();
          if (!response.ok) {
            setMessage(json.error?.message ?? "Import failed");
            return;
          }
          const errors = json.data.errors as Array<{ rowNumber: number; message: string }>;
          setMessage(
            `${commit ? "Committed" : "Validated"} ${json.data.validCount} rows. ${errors.length} row errors.${
              errors[0] ? ` First: row ${errors[0].rowNumber} ${errors[0].message}` : ""
            }`,
          );
        }}
      >
        <input name="file" type="file" accept=".csv,text/csv" required className="block" />
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="commit" className="h-5 w-5" />
          Commit valid rows
        </label>
        <Button type="submit">Preview / import</Button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
    </Card>
  );
}
