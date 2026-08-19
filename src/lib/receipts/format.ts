import { formatUsd } from "@/lib/utils";

export function formatReceiptDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatReceiptDay(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function formatPricePerGallon(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${formatUsd(value)}/gal`;
}

export function ocrConfidenceLabel(confidence: number | null | undefined) {
  if (confidence == null) return "OCR confidence unknown";
  return `OCR ${Math.round(confidence * 100)}%`;
}
