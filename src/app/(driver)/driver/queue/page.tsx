import { QueueList } from "@/components/driver/queue-status";
import { requireSession } from "@/lib/auth/session";

export default async function QueuePage() {
  const user = await requireSession();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Waiting to upload</h1>
      <p className="text-sm text-muted">
        iOS does not guarantee background sync. Keep this screen open and tap Retry when you have
        service.
      </p>
      <QueueList userId={user.authUserId} />
    </div>
  );
}
