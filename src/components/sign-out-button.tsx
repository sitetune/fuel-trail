"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { queuedCount } from "@/lib/offline/queue";
import { signOutAction } from "@/app/(auth)/actions";

export function SignOutButton() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const userId = document.cookie;
    void userId;
  }, []);
  return (
    <form
      action={async () => {
        const userId = window.localStorage.getItem("fueltrail-user-id");
        if (userId) {
          const count = await queuedCount(userId);
          if (count > 0 && !window.confirm(`You have ${count} receipt(s) waiting to upload. Sign out anyway?`)) {
            setBlocked(true);
            return;
          }
        }
        await signOutAction();
      }}
    >
      <Button type="submit" variant="ghost" size="sm">
        {blocked ? "Sign out" : "Sign out"}
      </Button>
    </form>
  );
}
