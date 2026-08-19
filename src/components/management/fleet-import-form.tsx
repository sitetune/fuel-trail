"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { CsvTemplateDownloads } from "@/components/management/csv-template-downloads";
import { FLEET_IMPORT_KINDS, fieldLabel, headersForKind, type FleetImportKind } from "@/lib/imports/fleet";

type PreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  error: string | null;
  duplicateOf?: string;
};

type SavedMapping = {
  id: string;
  kind: string;
  name: string;
  mapping: Record<string, string>;
};

export function FleetImportForm({
  savedMappings,
  canCommit,
}: {
  savedMappings: SavedMapping[];
  canCommit: boolean;
}) {
  const [kind, setKind] = useState<FleetImportKind>("trucks");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [mappingName, setMappingName] = useState("");
  const expected = useMemo(() => headersForKind(kind), [kind]);
  const kindMappings = savedMappings.filter((item) => item.kind === kind);

  async function runImport(form: HTMLFormElement, commit: boolean) {
    const data = new FormData(form);
    data.set("commit", commit ? "true" : "false");
    data.set("sendInvites", (form.elements.namedItem("sendInvites") as HTMLInputElement | null)?.checked ? "true" : "false");
    if (Object.keys(mapping).length) data.set("mapping", JSON.stringify(mapping));
    const response = await fetch("/api/imports/fleet", { method: "POST", body: data });
    const json = await response.json();
    if (!response.ok) {
      setMessage(json.error?.message ?? "Import failed");
      return;
    }
    const errors = json.data.errors as Array<{ rowNumber: number; message: string }>;
    setPreview((json.data.preview ?? []) as PreviewRow[]);
    setHeaders((json.data.headers ?? []) as string[]);
    setMapping((json.data.mapping ?? {}) as Record<string, string>);
    setJobId(json.data.jobId ?? null);
    setMessage(
      `${commit ? "Committed" : "Validated"} ${json.data.validCount} rows. ${errors.length} row errors.${
        json.data.imported ? ` Imported ${json.data.imported}.` : ""
      }${errors[0] ? ` First: row ${errors[0].rowNumber} ${errors[0].message}` : ""}`,
    );
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Import fleet CSV</h2>
        <p className="text-sm text-[#5E6B75]">
          Download a template, fill your rows, then upload. Map columns if your file uses different headers.
        </p>
      </div>
      <CsvTemplateDownloads kinds={["trucks", "drivers", "assignments"]} />
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          await runImport(event.currentTarget, false);
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
          onChange={(event) => {
            setKind(event.target.value as FleetImportKind);
            setPreview([]);
            setHeaders([]);
            setMapping({});
            setMessage("");
          }}
        >
          {FLEET_IMPORT_KINDS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {kindMappings.length ? (
          <div>
            <Label htmlFor="savedMapping">Saved mapping</Label>
            <select
              id="savedMapping"
              className="h-11 w-full rounded-md border px-3"
              defaultValue=""
              onChange={(event) => {
                const selected = kindMappings.find((item) => item.id === event.target.value);
                if (selected) setMapping(selected.mapping);
              }}
            >
              <option value="">Auto-detect columns</option>
              {kindMappings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
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
        {kind === "drivers" ? (
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="sendInvites" className="h-5 w-5" />
            Send invitations after import
          </label>
        ) : null}
        {headers.length ? (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Column mapping</p>
            {expected.map((field) => (
              <label key={field} className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr] sm:items-center">
                <span className="capitalize">{fieldLabel(field)}</span>
                <select
                  className="h-11 rounded-md border px-3"
                  value={mapping[field] ?? ""}
                  onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}
                >
                  <option value="">Not mapped</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {canCommit ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <Input
                  value={mappingName}
                  onChange={(event) => setMappingName(event.target.value)}
                  placeholder="Save mapping as…"
                  aria-label="Mapping name"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const name = mappingName.trim();
                    if (!name) {
                      setMessage("Name the mapping before saving.");
                      return;
                    }
                    const response = await fetch("/api/imports/mappings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ kind, name, mapping }),
                    });
                    setMessage(response.ok ? `Saved mapping “${name}”.` : "Could not save mapping.");
                  }}
                >
                  Save mapping
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline">
            Preview
          </Button>
          {canCommit ? (
            <Button
              type="button"
              variant="amber"
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) void runImport(form, true);
              }}
            >
              Commit valid rows
            </Button>
          ) : (
            <p className="text-sm text-[#5E6B75]">Auditors can preview imports but cannot commit them.</p>
          )}
        </div>
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
