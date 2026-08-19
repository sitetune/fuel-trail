/**
 * Next.js `redirect()` throws a special error. Catching it and mapping to a
 * login failure makes a successful sign-in look like a bad password.
 */
export function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function rethrowIfNextRedirect(error: unknown): void {
  if (isNextRedirectError(error)) {
    throw error;
  }
}
