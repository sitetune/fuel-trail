import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateOrgSettingsAction } from "../actions";
import { requireManagement } from "@/lib/auth/session";

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
        <Label htmlFor="retention_years">Retention years (minimum 4)</Label>
        <Input id="retention_years" name="retention_years" type="number" min={4} defaultValue={org.retention_years} />
        <Button type="submit" variant="amber">
          Save settings
        </Button>
      </form>
    </Card>
  );
}
