import { Badge } from "@/components/ui/card";
import { receiptStatusLabel, receiptStatusTone } from "@/lib/receipts/states";

export function ReceiptStatusBadge({ status }: { status: string | null | undefined }) {
  return <Badge tone={receiptStatusTone(status)}>{receiptStatusLabel(status)}</Badge>;
}
