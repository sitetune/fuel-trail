import { describe, expect, it } from "vitest";
import { isPlatformAdminEmail, organizationSlug, orgIsUsable } from "./status";

describe("organization helpers", () => {
  it("builds unique slugs from company names", () => {
    const slug = organizationSlug("Gulf Coast Haul");
    expect(slug.startsWith("gulf-coast-haul-")).toBe(true);
    expect(organizationSlug("Gulf Coast Haul")).not.toBe(slug);
  });

  it("matches platform admin emails from a comma list", () => {
    expect(isPlatformAdminEmail("Owner@Example.com", "other@x.com, owner@example.com")).toBe(true);
    expect(isPlatformAdminEmail("driver@example.com", "owner@example.com")).toBe(false);
  });

  it("treats missing status as usable for existing orgs", () => {
    expect(orgIsUsable("active")).toBe(true);
    expect(orgIsUsable(null)).toBe(true);
    expect(orgIsUsable("deactivated")).toBe(false);
    expect(orgIsUsable("pending_activation")).toBe(false);
  });
});
