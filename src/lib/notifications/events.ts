export const NOTIFICATION_EVENTS = [
  "receipt_uploaded",
  "ocr_needs_review",
  "ocr_low_confidence",
  "receipt_submitted",
  "receipt_verified",
  "receipt_rejected",
  "receipt_resubmitted",
  "receipt_image_replaced",
  "possible_duplicate",
  "import_completed",
  "import_failed",
  "unreviewed_aging",
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
