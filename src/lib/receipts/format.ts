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

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function titleCaseWords(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatCityState(city?: string | null, region?: string | null) {
  const cityPart = city?.trim() ? titleCaseWords(city.trim()) : null;
  const statePart = region?.trim()
    ? region.trim().length === 2
      ? region.trim().toUpperCase()
      : titleCaseWords(region.trim())
    : null;
  return [cityPart, statePart].filter(Boolean).join(", ") || "—";
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
