import { Card } from "@/components/ui/card";
import { ASSIGNMENT_CSV_HEADERS, DRIVER_CSV_HEADERS, TRUCK_CSV_HEADERS } from "@/lib/imports/fleet";
import { FUEL_PRICE_CSV_HEADERS } from "@/lib/reports/csv";

const GROUPS = [
  {
    title: "Trucks",
    required: "unit_number",
    headers: TRUCK_CSV_HEADERS,
  },
  {
    title: "Drivers",
    required: "full_name, email",
    headers: DRIVER_CSV_HEADERS,
  },
  {
    title: "Assignments",
    required: "email, unit_number",
    headers: ASSIGNMENT_CSV_HEADERS,
  },
  {
    title: "Station prices",
    required: "station_name, address, city, state, price, observed_at",
    headers: FUEL_PRICE_CSV_HEADERS,
  },
] as const;

export function ImportFieldGuide() {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Import fields</h2>
        <p className="mt-1 text-sm text-muted">
          First row is the header. Download a template, then keep these column names. Extra columns are ignored.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="font-medium">{group.title}</p>
            <p className="text-xs text-muted">Required: {group.required}</p>
            <p className="mt-1 font-mono text-xs leading-relaxed text-ink">{group.headers.join(", ")}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
