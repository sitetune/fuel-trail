"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmSubmit({
  action,
  message,
  children,
  variant = "danger",
  hidden,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
  variant?: "danger" | "outline" | "success";
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant={variant} size="sm">
        {children}
      </Button>
    </form>
  );
}
