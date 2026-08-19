import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[color,background-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-route focus-visible:ring-offset-2 focus-visible:ring-offset-warm disabled:pointer-events-none disabled:opacity-50 min-h-11 min-w-11 px-4 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-ink/90",
        primary: "bg-route text-white hover:bg-route-hover shadow-[0_8px_20px_rgba(23,107,255,0.28)]",
        amber: "bg-route text-white hover:bg-route-hover shadow-[0_8px_20px_rgba(23,107,255,0.28)]",
        outline: "border border-steel/60 bg-white text-ink hover:bg-warm",
        ghost: "text-ink hover:bg-white/70",
        danger: "bg-alert text-white hover:bg-alert/90",
        success: "bg-success text-white hover:bg-success/90",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-3 text-sm",
        lg: "h-14 min-h-14 px-6 text-base",
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
