export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "unauthenticated" | "inactive" | "forbidden" | "unconfigured" | "pending",
  ) {
    super(message);
  }
}
