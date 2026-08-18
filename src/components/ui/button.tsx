import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-11 min-w-11 px-4",
  {
    variants: {
      variant: {
        default: "bg-[#0B1F33] text-white hover:bg-[#12314d]",
        amber: "bg-[#F5A524] text-[#0B1F33] hover:bg-[#e09416] font-semibold",
        outline: "border border-[#5E6B75]/30 bg-white hover:bg-[#F7F8FA] text-[#0B1F33]",
        ghost: "hover:bg-[#F7F8FA] text-[#0B1F33]",
        danger: "bg-[#C93C37] text-white hover:bg-[#b1322e]",
        success: "bg-[#198754] text-white hover:bg-[#157347]",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-3",
        lg: "h-14 min-h-14 text-base px-6",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
