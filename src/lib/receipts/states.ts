import type { ReceiptStatus } from "@/types/domain";

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  draft: "Draft",
  processing: "Reading receipt",
  needs_review: "Needs review",
  submitted: "Submitted",
  verified: "Verified",
  rejected: "Rejected — Action Required",
  archived: "Archived",
};

export const RECEIPT_STATUS_TONES: Record<ReceiptStatus, "neutral" | "success" | "alert" | "amber" | "navy"> = {
  draft: "neutral",
  processing: "amber",
  needs_review: "amber",
  submitted: "navy",
  verified: "success",
  rejected: "alert",
  archived: "neutral",
};

const ALLOWED_TRANSITIONS: Record<ReceiptStatus, ReceiptStatus[]> = {
  draft: ["processing", "needs_review", "archived"],
  processing: ["needs_review", "archived"],
  needs_review: ["submitted", "needs_review", "rejected", "verified", "archived"],
  submitted: ["verified", "rejected", "needs_review", "archived"],
  verified: ["archived", "needs_review"],
  rejected: ["needs_review", "submitted", "archived"],
  archived: [],
};

export function receiptStatusLabel(status: string | null | undefined) {
  if (!status) return "Unknown";
  return RECEIPT_STATUS_LABELS[status as ReceiptStatus] ?? status.replaceAll("_", " ");
}

export function receiptStatusTone(status: string | null | undefined) {
  if (!status) return "neutral" as const;
  return RECEIPT_STATUS_TONES[status as ReceiptStatus] ?? "neutral";
}

export function canTransitionReceipt(from: ReceiptStatus, to: ReceiptStatus) {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertReceiptTransition(from: ReceiptStatus, to: ReceiptStatus) {
  if (!canTransitionReceipt(from, to)) {
    throw new Error(`Receipt cannot move from ${receiptStatusLabel(from)} to ${receiptStatusLabel(to)}.`);
  }
}

export function driverCanEditReceipt(status: ReceiptStatus) {
  return status === "draft" || status === "processing" || status === "needs_review" || status === "rejected";
}

export function driverCanReplaceImage(status: ReceiptStatus) {
  return status === "draft" || status === "needs_review" || status === "rejected";
}

export function isRejectedActionRequired(status: string | null | undefined) {
  return status === "rejected";
}

export function isLowOcrConfidence(confidence: number | null | undefined) {
  return confidence != null && confidence < 0.6;
}
