import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-steel/50 bg-white px-3 py-2 text-base text-ink shadow-[0_1px_2px_rgba(11,23,40,0.04)] placeholder:text-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-route disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-steel/50 bg-white px-3 py-2 text-base text-ink shadow-[0_1px_2px_rgba(11,23,40,0.04)] placeholder:text-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-route",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("text-sm font-medium text-ink", className)} {...props} />
  );
}

export function FieldError({ message }: { message?: string }) {
  return (
    <p className="min-h-5 text-sm text-alert" role={message ? "alert" : undefined}>
      {message ?? ""}
    </p>
  );
}
