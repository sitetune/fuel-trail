import { describe, expect, it } from "vitest";
import { sendNotificationEmail } from "./email";

describe("notification email", () => {
  it("skips sending when Resend is not configured", async () => {
    const status = await sendNotificationEmail({
      to: "manager@example.com",
      eventType: "receipt_rejected",
      title: "Receipt rejected",
      body: "Please correct this receipt.",
      href: "/driver/receipts/1",
    });
    expect(status).toBe("skipped");
  });
});
