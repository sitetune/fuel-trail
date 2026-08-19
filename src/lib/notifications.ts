import { createServiceRoleClient } from "@/lib/supabase/admin";

export type NotificationEvent =
  | "receipt_uploaded"
  | "ocr_needs_review"
  | "ocr_low_confidence"
  | "receipt_submitted"
  | "receipt_verified"
  | "receipt_rejected"
  | "receipt_resubmitted"
  | "receipt_image_replaced"
  | "possible_duplicate"
  | "import_completed"
  | "import_failed";

type NotifyInput = {
  organizationId: string;
  recipientIds: string[];
  eventType: NotificationEvent;
  title: string;
  body: string;
  href?: string;
  entityType?: string;
  entityId?: string;
};

export async function notify(input: NotifyInput) {
  const recipientIds = [...new Set(input.recipientIds.filter(Boolean))];
  if (recipientIds.length === 0) return;
  try {
    const admin = createServiceRoleClient();
    const rows = recipientIds.map((recipientId) => ({
      organization_id: input.organizationId,
      recipient_id: recipientId,
      event_type: input.eventType,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      email_status: "skipped",
      idempotency_key: `${input.eventType}:${input.entityId ?? "none"}:${recipientId}`,
    }));
    const { error } = await admin.from("notifications").upsert(rows, {
      onConflict: "idempotency_key",
      ignoreDuplicates: true,
    });
    if (error) {
      await admin.from("app_audit_events").insert({
        organization_id: input.organizationId,
        entity_type: input.entityType ?? "notification",
        entity_id: input.entityId ?? null,
        event_type: "notification_failed",
        metadata: { message: error.message, eventType: input.eventType },
      });
    }
  } catch {
    // Receipt actions must succeed even if notification delivery fails.
  }
}

export async function managementRecipientIds(organizationId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["owner_admin", "manager"]);
  return (data ?? []).map((row) => row.id);
}
