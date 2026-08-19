import { ReceiptCapture } from "@/components/driver/receipt-capture";
import { requireSession } from "@/lib/auth/session";
import { getActiveAssignment } from "@/lib/receipts/service";

export default async function NewReceiptPage() {
  const user = await requireSession();
  const assignment = await getActiveAssignment(user.authUserId);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Scan fuel receipt</h1>
      <p className="text-sm text-muted">
        The original photo is stored untouched. A smaller copy may be created only for faster
        review.
      </p>
      <ReceiptCapture
        userId={user.authUserId}
        organizationId={user.organization.id}
        truckId={assignment?.truck_id ?? null}
      />
    </div>
  );
}
