import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-[#5E6B75]/20 bg-white p-4 shadow-sm", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "alert" | "amber" | "navy";
}) {
  const tones = {
    neutral: "bg-[#F7F8FA] text-[#5E6B75]",
    success: "bg-[#198754]/10 text-[#198754]",
    alert: "bg-[#C93C37]/10 text-[#C93C37]",
    amber: "bg-[#F5A524]/20 text-[#0B1F33]",
    navy: "bg-[#0B1F33] text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
