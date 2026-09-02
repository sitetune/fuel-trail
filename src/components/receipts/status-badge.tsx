import { Badge } from "@/components/ui/card";
import { receiptStatusLabel, receiptStatusTone } from "@/lib/receipts/states";

export function ReceiptStatusBadge({
  status,
  compact,
}: {
  status: string | null | undefined;
  compact?: boolean;
}) {
  const label = compact && status === "rejected" ? "Rejected" : receiptStatusLabel(status);
  return (
    <Badge tone={receiptStatusTone(status)} className="whitespace-nowrap">
      {label}
    </Badge>
  );
}
