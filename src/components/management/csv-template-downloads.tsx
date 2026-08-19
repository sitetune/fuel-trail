import { Button } from "@/components/ui/button";
import { IMPORT_TEMPLATE_KINDS, importTemplateFilename, type ImportTemplateKind } from "@/lib/imports/templates";

const LABELS: Record<ImportTemplateKind, string> = {
  trucks: "Truck CSV template",
  drivers: "Driver CSV template",
  assignments: "Assignment CSV template",
  "fuel-prices": "Station price CSV template",
};

export function CsvTemplateDownloads({
  kinds = [...IMPORT_TEMPLATE_KINDS],
}: {
  kinds?: ImportTemplateKind[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {kinds.map((kind) => (
        <Button key={kind} asChild variant="outline">
          <a href={`/api/imports/templates/${kind}`} download={importTemplateFilename(kind)}>
            {LABELS[kind]}
          </a>
        </Button>
      ))}
    </div>
  );
}
