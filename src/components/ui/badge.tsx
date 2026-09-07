import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  /** `accent` for anything that should read as a status, not a label. */
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-eyebrow font-semibold uppercase",
        tone === "accent"
          ? "border-accent/30 bg-accent-soft text-accent-strong"
          : "border-line bg-panel text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
