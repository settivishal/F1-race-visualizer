import { Skeleton } from "./skeleton";

/**
 * The generic fallback, for places with no better-known shape. Where the
 * footprint of the incoming content *is* known — the replay, most importantly —
 * build a Skeleton to that shape instead, so the page does not resize when the
 * content arrives.
 */
export function LoadingState({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
