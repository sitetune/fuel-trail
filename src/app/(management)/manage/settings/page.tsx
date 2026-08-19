import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateOrgSettingsAction } from "../actions";
import { requireManagement } from "@/lib/auth/session";
import { parseReviewRules } from "@/lib/orgs/review-rules";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireManagement();
  const params = await searchParams;
  if (user.profile.role !== "owner_admin") {
    return <p>Only the owner can change organization security and retention settings.</p>;
  }
  const org = user.organization;
  const rules = parseReviewRules(org.review_rules);
  return (
    <Card className="max-w-xl space-y-3">
      <h1 className="text-3xl font-semibold">Organization settings</h1>
      {params.error === "retention" ? (
        <p className="text-[#C93C37]">Retention cannot be below 4 years.</p>
      ) : null}
      {params.saved ? <p className="text-[#198754]">Saved.</p> : null}
      <form action={updateOrgSettingsAction} className="space-y-3">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={org.name} />
        <Label htmlFor="base_jurisdiction">Base jurisdiction</Label>
        <Input id="base_jurisdiction" name="base_jurisdiction" defaultValue={org.base_jurisdiction ?? ""} maxLength={2} />
        <Label htmlFor="timezone">Timezone</Label>
        <Input id="timezone" name="timezone" defaultValue={org.timezone} />
        <Input name="default_tank_capacity_gallons" type="number" defaultValue={org.default_tank_capacity_gallons} />
        <Input name="default_target_mpg" type="number" step="0.1" defaultValue={org.default_target_mpg} />
        <Input name="default_week_start_min_gallons" type="number" defaultValue={org.default_week_start_min_gallons} />
        <Input name="default_reserve_gallons" type="number" defaultValue={org.default_reserve_gallons} />
        <Input name="default_cost_per_mile" type="number" step="0.01" defaultValue={org.default_cost_per_mile ?? ""} placeholder="Cost per mile" />
        <Input name="default_driver_time_value_hourly" type="number" step="0.01" defaultValue={org.default_driver_time_value_hourly ?? ""} placeholder="Driver time $/hr" />
        <Label htmlFor="comparison_radius_miles">Savings comparison radius (miles)</Label>
        <Input id="comparison_radius_miles" name="comparison_radius_miles" type="number" step="0.1" defaultValue={org.comparison_radius_miles} />
        <Label htmlFor="price_freshness_hours">Price freshness (hours)</Label>
        <Input id="price_freshness_hours" name="price_freshness_hours" type="number" defaultValue={org.price_freshness_hours} />
        <Label htmlFor="default_fuel_type">Default fuel type</Label>
        <Input id="default_fuel_type" name="default_fuel_type" defaultValue={org.default_fuel_type ?? "diesel"} />
        <Label htmlFor="address">Company address</Label>
        <Input id="address" name="address" defaultValue={org.address ?? ""} />
        <Label htmlFor="primary_contact_name">Primary contact</Label>
        <Input id="primary_contact_name" name="primary_contact_name" defaultValue={org.primary_contact_name ?? ""} />
        <Label htmlFor="primary_contact_email">Primary contact email</Label>
        <Input id="primary_contact_email" name="primary_contact_email" type="email" defaultValue={org.primary_contact_email ?? ""} />
        <Label htmlFor="retention_years">Retention years (minimum 4)</Label>
        <Input id="retention_years" name="retention_years" type="number" min={4} defaultValue={org.retention_years} />
        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="font-medium">Receipt review rules</legend>
          <p className="text-sm text-[#5E6B75]">Drivers cannot submit until these fields are filled.</p>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="require_odometer" className="h-5 w-5" defaultChecked={rules.requireOdometer} />
            Require odometer
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="require_receipt_number" className="h-5 w-5" defaultChecked={rules.requireReceiptNumber} />
            Require receipt / transaction number
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="require_payment_last4" className="h-5 w-5" defaultChecked={rules.requirePaymentLast4} />
            Require card last four
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="require_tank_level" className="h-5 w-5" defaultChecked={rules.requireTankLevel} />
            Require tank level after fueling
          </label>
        </fieldset>
        <Button type="submit" variant="amber">
          Save settings
        </Button>
      </form>
      <form action="/api/org/logo" method="post" encType="multipart/form-data" className="space-y-3 border-t pt-3">
        <Label htmlFor="logo">Company logo</Label>
        {org.logo_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/api/org/logo" alt="Company logo" className="h-16 w-16 rounded-lg object-contain" />
        ) : null}
        <input id="logo" name="file" type="file" accept="image/png,image/jpeg,image/webp" required className="block min-h-11" />
        <Button type="submit" variant="outline">
          Upload logo
        </Button>
      </form>
    </Card>
  );
}
