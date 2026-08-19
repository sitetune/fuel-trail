"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FLEET_IMPORT_KINDS, fleetTemplateCsv, type FleetImportKind } from "@/lib/imports/fleet";

type PreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  error: string | null;
  duplicateOf?: string;
};

export function FleetImportForm() {
  const [kind, setKind] = useState<FleetImportKind>("trucks");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const template = fleetTemplateCsv(kind);

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Import Center</h2>
      <p className="text-sm text-[#5E6B75]">
        Preview and validate first. Driver imports do not send invitations unless you choose to.
      </p>
      <div className="flex flex-wrap gap-2">
        {FLEET_IMPORT_KINDS.map((option) => (
          <a
            key={option}
            className="inline-flex min-h-11 items-center underline"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(fleetTemplateCsv(option))}`}
            download={`fueltrail-${option}-template.csv`}
          >
            {option} template
          </a>
        ))}
      </div>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const commit = (form.elements.namedItem("commit") as HTMLInputElement).checked;
          const data = new FormData(form);
          data.set("commit", commit ? "true" : "false");
          data.set("sendInvites", (form.elements.namedItem("sendInvites") as HTMLInputElement).checked ? "true" : "false");
          const response = await fetch("/api/imports/fleet", { method: "POST", body: data });
          const json = await response.json();
          if (!response.ok) {
            setMessage(json.error?.message ?? "Import failed");
            return;
          }
          const errors = json.data.errors as Array<{ rowNumber: number; message: string }>;
          setPreview((json.data.preview ?? []) as PreviewRow[]);
          setMessage(
            `${commit ? "Committed" : "Validated"} ${json.data.validCount} rows. ${errors.length} row errors.${
              json.data.imported ? ` Imported ${json.data.imported}.` : ""
            }${errors[0] ? ` First: row ${errors[0].rowNumber} ${errors[0].message}` : ""}`,
          );
        }}
      >
        <label className="block text-sm font-medium" htmlFor="kind">
          Data type
        </label>
        <select
          id="kind"
          name="kind"
          className="h-11 w-full rounded-md border px-3"
          value={kind}
          onChange={(event) => setKind(event.target.value as FleetImportKind)}
        >
          {FLEET_IMPORT_KINDS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input name="file" type="file" accept=".csv,text/csv" required className="block" />
        <label className="block text-sm font-medium" htmlFor="duplicateMode">
          Existing rows
        </label>
        <select id="duplicateMode" name="duplicateMode" className="h-11 w-full rounded-md border px-3">
          <option value="skip">Skip duplicates</option>
          <option value="update">Update duplicates</option>
        </select>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="commit" className="h-5 w-5" />
          Commit valid rows
        </label>
        {kind === "drivers" ? (
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="sendInvites" className="h-5 w-5" />
            Send invitations after import
          </label>
        ) : null}
        <Button type="submit">Preview / import</Button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
      {preview.length ? (
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Row</th>
                <th>Values</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.rowNumber} className="border-b align-top">
                  <td className="py-2">{row.rowNumber}</td>
                  <td>{Object.values(row.values).filter(Boolean).join(" · ")}</td>
                  <td>{row.error ?? (row.duplicateOf ? `Duplicate of ${row.duplicateOf}` : "OK")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="sr-only">{template}</p>
    </Card>
  );
}
