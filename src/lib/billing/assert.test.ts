import { describe, expect, it } from "vitest";
import { assertPlanAllows, PlanLimitError } from "./assert";

const starter = { plan_id: "starter", status: "active", billing_status: "active" };
const growth = { plan_id: "growth", status: "active", billing_status: "active" };

describe("assertPlanAllows", () => {
  it("locks reports on Starter and allows them on Growth", () => {
    expect(() => assertPlanAllows(starter, "reports")).toThrow(PlanLimitError);
    expect(() => assertPlanAllows(growth, "reports")).not.toThrow();
  });

  it("enforces truck caps", () => {
    expect(() => assertPlanAllows(starter, "add_truck", { activeTruckCount: 5 })).toThrow(/5 trucks/);
    expect(() => assertPlanAllows(starter, "add_truck", { activeTruckCount: 4 })).not.toThrow();
  });
});
