"use client";

import { useEffect, useState } from "react";

export function OfflineBadge() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (online) return null;
  return (
    <div className="bg-alert px-3 py-2 text-center text-sm font-semibold text-white">
      Offline — receipts will wait on this device until you retry.
    </div>
  );
}
