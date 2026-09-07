import { cn } from "@/lib/cn";

/**
 * A placeholder built to the footprint of the thing it stands in for.
 *
 * This is what keeps the loading path from shifting the page: a fallback that
 * is shorter than its content makes the layout jump when the content streams
 * in. Callers are expected to pass real dimensions rather than accept a
 * default, which is why there isn't one.
 *
 * The pulse is a CSS animation, so the global `prefers-reduced-motion` rule in
 * globals.css stops it without this component knowing about the preference.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-line", className)}
    />
  );
}
