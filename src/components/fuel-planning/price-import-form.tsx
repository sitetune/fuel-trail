"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PriceImportForm() {
  const [message, setMessage] = useState("");
  return (
    <Card className="space-y-3">
        <h2 className="font-semibold">Import station prices</h2>
        <Button asChild variant="outline">
          <a href="/api/imports/templates/fuel-prices" download="fueltrail-fuel-prices-template.csv">
            Download station price CSV template
          </a>
        </Button>
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
