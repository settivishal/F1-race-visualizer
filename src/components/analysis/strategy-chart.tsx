import { cn } from "@/lib/cn";

export type StrategyRow = {
  code: string;
  name: string;
  stints: {
    stintNumber: number;
    lapStart: number;
    lapEnd: number;
    compound: string | null;
  }[];
  stops: { lap: number; durationSeconds: number | null }[];
  /** Laps this driver sat in the pit lane because the race was stopped. */
  stoppageLaps: number[];
};

/**
 * Tyre colours as the sport uses them. A compound the ingest has never seen
 * falls back to the muted token rather than to an invented colour, because a
 * made-up tyre colour is a lie a reader cannot detect.
 */
const COMPOUND: Record<string, { fill: string; label: string }> = {
  SOFT: { fill: "#e8002d", label: "Soft" },
  MEDIUM: { fill: "#f5c518", label: "Medium" },
  HARD: { fill: "#e8eaed", label: "Hard" },
  INTERMEDIATE: { fill: "#22c55e", label: "Intermediate" },
  WET: { fill: "#3b82f6", label: "Wet" },
};

/**
 * One bar per driver, split into stints — the shape of the race's strategy at a
 * glance, and the one chart where a viewer sees why the lap times move.
 *
 * Plain HTML, not SVG: a stint is a proportional box in a row, which is what a
 * flex layout already is. That also makes it responsive without a viewBox and
 * readable by a screen reader as a list of stints rather than as a picture.
 */
export function StrategyChart({
  rows,
  totalLaps,
}: {
  rows: StrategyRow[];
  totalLaps: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        No tyre data was published for this race.
      </p>
    );
  }

  const compoundsUsed = [
    ...new Set(rows.flatMap((r) => r.stints.map((s) => s.compound).filter(Boolean))),
  ] as string[];

  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {compoundsUsed.map((compound) => (
          <li key={compound} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="h-2.5 w-2.5 rounded-full border border-line"
              style={{ backgroundColor: COMPOUND[compound]?.fill ?? "var(--subtle)" }}
              aria-hidden
            />
            {COMPOUND[compound]?.label ?? compound}
          </li>
        ))}
        {/* Only where the race was actually stopped, so the legend never
            explains a mark that is not on the chart. */}
        {rows.some((row) => row.stoppageLaps.length > 0) ? (
          <li className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-3.5 w-0.5 bg-flag-red" aria-hidden />
            Red flag
          </li>
        ) : null}
      </ul>

      <ol className="mt-4 space-y-1.5">
        {rows.map((row) => (
          <li key={row.code} className="flex items-center gap-3">
            <span className="w-10 shrink-0 font-mono text-xs font-medium text-muted">
              {row.code}
            </span>
            <span className="relative flex h-6 flex-1 gap-px overflow-hidden rounded-md bg-line/40">
              {row.stints.map((stint) => {
                const laps = stint.lapEnd - stint.lapStart + 1;
                const compound = stint.compound ?? "";
                // The stint that began when the race restarted. Its tyres were
                // changed while the field stood still, which is not a stop.
                const afterStoppage = row.stoppageLaps.includes(stint.lapStart - 1);
                return (
                  <span
                    key={stint.stintNumber}
                    title={`${row.name}: laps ${stint.lapStart}–${stint.lapEnd} on ${
                      COMPOUND[compound]?.label ?? (compound || "an unknown compound")
                    }${afterStoppage ? ", fitted while the race was stopped" : ""}`}
                    className={cn(
                      "flex items-center justify-center text-[10px] font-semibold",
                      compound === "HARD" ? "text-track" : "text-white",
                      // A red-flag boundary, drawn on the stint that follows it.
                      afterStoppage && "border-l-2 border-flag-red",
                    )}
                    style={{
                      // A share of the race distance, not of the row: a driver
                      // who retired on lap 32 gets a bar that stops there, so
                      // the rows are comparable to each other rather than each
                      // stretched to full width.
                      width: `${(laps / Math.max(totalLaps, 1)) * 100}%`,
                      backgroundColor: COMPOUND[compound]?.fill ?? "var(--subtle)",
                    }}
                  >
                    {laps > 3 ? laps : ""}
                  </span>
                );
              })}
            </span>
            {/* The count only. A red flag stops everyone, so saying so on every
                row is one fact printed twenty times — the legend says it once
                and the divider says where. */}
            <span className="tabular w-24 shrink-0 text-right text-xs text-muted">
              {row.stops.length === 0
                ? "no stops"
                : `${row.stops.length} ${row.stops.length === 1 ? "stop" : "stops"}`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
