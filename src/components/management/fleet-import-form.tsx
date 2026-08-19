"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CsvTemplateDownloads } from "@/components/management/csv-template-downloads";
import { FLEET_IMPORT_KINDS, type FleetImportKind } from "@/lib/imports/fleet";

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
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Import fleet CSV</h2>
        <p className="text-sm text-[#5E6B75]">
          Download a template, fill your rows, then upload. Driver imports do not email invitations unless you check that box.
        </p>
      </div>
      <CsvTemplateDownloads kinds={["trucks", "drivers", "assignments"]} />
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const commit = (form.elements.namedItem("commit") as HTMLInputElement).checked;
          const data = new FormData(form);
          data.set("commit", commit ? "true" : "false");
          data.set(
            "sendInvites",
            (form.elements.namedItem("sendInvites") as HTMLInputElement | null)?.checked ? "true" : "false",
          );
          const response = await fetch("/api/imports/fleet", { method: "POST", body: data });
          const json = await response.json();
          if (!response.ok) {
            setMessage(json.error?.message ?? "Import failed");
            return;
          }
          const errors = json.data.errors as Array<{ rowNumber: number; message: string }>;
          setPreview((json.data.preview ?? []) as PreviewRow[]);
          setJobId(json.data.jobId ?? null);
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
        <label className="block text-sm font-medium" htmlFor="file">
          CSV file
        </label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required className="block min-h-11" />
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
        <Button type="submit" variant="amber">
          Preview / import
        </Button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
      {jobId ? (
        <Button asChild variant="outline">
          <a href={`/api/imports/jobs/${jobId}/errors.csv`} download={`fueltrail-import-${jobId}-errors.csv`}>
            Download error file
          </a>
        </Button>
      ) : null}
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
    </Card>
  );
}
