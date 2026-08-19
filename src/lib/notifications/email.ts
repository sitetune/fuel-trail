import { getServerEnv } from "@/lib/env";
import { brand } from "@/config/brand";
import type { NotificationEvent } from "@/lib/notifications/events";

export async function sendNotificationEmail(input: {
  to: string;
  eventType: NotificationEvent;
  title: string;
  body: string;
  href?: string;
}) {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return "skipped" as const;
  const url = input.href ? `${env.NEXT_PUBLIC_APP_URL}${input.href}` : env.NEXT_PUBLIC_APP_URL;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [input.to],
      subject: `${brand.name}: ${input.title}`,
      text: `${input.body}\n\n${url}\n`,
    }),
  });
  return response.ok ? ("sent" as const) : ("failed" as const);
}
