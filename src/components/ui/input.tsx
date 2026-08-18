import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-[#5E6B75]/30 bg-white px-3 py-2 text-base text-[#0B1F33] shadow-sm placeholder:text-[#5E6B75] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50",
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
        "flex min-h-24 w-full rounded-md border border-[#5E6B75]/30 bg-white px-3 py-2 text-base text-[#0B1F33] shadow-sm placeholder:text-[#5E6B75] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("text-sm font-medium text-[#0B1F33]", className)} {...props} />
  );
}

export function FieldError({ message }: { message?: string }) {
  return (
    <p className="min-h-5 text-sm text-[#C93C37]" role={message ? "alert" : undefined}>
      {message ?? ""}
    </p>
  );
}
