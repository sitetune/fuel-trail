import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    correlationId: string;
  };
};

export function correlationId() {
  return crypto.randomUUID();
}

export function apiError(
  status: number,
  code: string,
  message: string,
  id = correlationId(),
) {
  const body: ApiErrorBody = {
    error: { code, message, correlationId: id },
  };
  return NextResponse.json(body, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function safeLog(message: string, extra?: Record<string, unknown>) {
  const redacted = extra
    ? Object.fromEntries(
        Object.entries(extra).map(([key, value]) => {
          if (/key|secret|token|password|authorization/i.test(key)) {
            return [key, "[redacted]"];
          }
          if (/url/i.test(key) && typeof value === "string" && value.includes("token=")) {
            return [key, "[signed-url-redacted]"];
          }
          return [key, value];
        }),
      )
    : undefined;
  console.info(message, redacted);
}
