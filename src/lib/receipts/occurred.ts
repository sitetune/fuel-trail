export function receiptOccurredAt(row: { purchased_at?: string | null; created_at?: string | null }) {
  if (row.purchased_at) {
    const purchased = new Date(row.purchased_at);
    if (!Number.isNaN(purchased.getTime())) return purchased;
  }
  if (row.created_at) {
    const created = new Date(row.created_at);
    if (!Number.isNaN(created.getTime())) return created;
  }
  return null;
}
