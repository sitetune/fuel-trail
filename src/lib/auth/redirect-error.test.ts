import { describe, expect, it } from "vitest";
import { isNextRedirectError, rethrowIfNextRedirect } from "./redirect-error";

describe("Next.js redirect errors", () => {
  it("recognizes NEXT_REDIRECT digest values", () => {
    expect(isNextRedirectError({ digest: "NEXT_REDIRECT;replace;/manage;307;" })).toBe(true);
    expect(isNextRedirectError(new Error("boom"))).toBe(false);
    expect(isNextRedirectError("NEXT_REDIRECT")).toBe(false);
  });

  it("rethrows redirect errors and ignores others", () => {
    const redirect = { digest: "NEXT_REDIRECT;replace;/manage;307;" };
    expect(() => rethrowIfNextRedirect(redirect)).toThrow(redirect);
    expect(() => rethrowIfNextRedirect(new Error("inactive"))).not.toThrow();
  });
});
