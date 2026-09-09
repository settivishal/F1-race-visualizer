"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { formatLapTime, linePath } from "@/lib/scale";
import { ChartFrame } from "./chart-frame";

export type LapTimeSeries = {
  id: string;
  code: string;
  name: string;
  color: string;
  laps: { lap: number; time: number; isOutlier: boolean }[];
};

/** How many drivers are drawn before the reader is choosing rather than reading. */
const DEFAULT_SELECTED = 5;

/**
 * Lap times, one line per driver.
 *
 * Twenty overlapping traces is a picture of a race that answers no question, so
 * five are drawn to begin with — the classification's top five, as ordered by
 * the caller — and the rest are one tap away. The selection is the whole
 * interaction, which is why it is the only client state here.
 *
 * Outlier laps (a pit lap, its out-lap, a safety-car lap) break the line rather
 * than bend it. A trace that dives thirty seconds and comes back makes the two
 * seconds that separate the drivers unreadable, and joining across the gap would
 * draw a lap that was never run. Their dots stay, faint and pinned to the edge
 * of the plot, so a gap reads as "something happened here" rather than as
 * missing data.
 */
export function LapTimeChart({ series }: { series: LapTimeSeries[] }) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<string[]>(() =>
    series.slice(0, DEFAULT_SELECTED).map((s) => s.id),
  );

  const shown = series.filter((s) => selected.includes(s.id));

  // The domain comes from the representative laps only. Including a
  // thirty-second pit lap would flatten every real difference into one pixel.
  const domain = useMemo(() => {
    const laps: number[] = [];
    const times: number[] = [];
    for (const driver of series) {
      for (const lap of driver.laps) {
        laps.push(lap.lap);
        if (!lap.isOutlier) times.push(lap.time);
      }
    }
    if (times.length === 0) return null;

    const pad = (Math.max(...times) - Math.min(...times)) * 0.08 || 0.5;
    return {
      x: [Math.min(...laps), Math.max(...laps)] as [number, number],
      y: [Math.min(...times) - pad, Math.max(...times) + pad] as [number, number],
    };
  }, [series]);

  if (!domain) {
    return (
      <p className="text-sm text-muted">
        No lap times were recorded for this race.
      </p>
    );
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {series.map((driver) => {
          const isOn = selected.includes(driver.id);
          return (
            <li key={driver.id}>
              <button
                type="button"
                aria-pressed={isOn}
                onClick={() =>
                  setSelected((current) =>
                    current.includes(driver.id)
                      ? current.filter((id) => id !== driver.id)
                      : [...current, driver.id],
                  )
                }
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  isOn
                    ? "border-line-strong bg-panel-strong text-foreground"
                    : "border-line text-muted hover:text-foreground",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: isOn ? driver.color : "var(--subtle)" }}
                  aria-hidden
                />
                {driver.code}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <ChartFrame
          xDomain={domain.x}
          yDomain={domain.y}
          xLabel="Lap"
          yLabel="Lap time"
          formatY={(value) => formatLapTime(value)}
          title={`Lap times for ${shown.map((s) => s.name).join(", ") || "no drivers selected"}`}
        >
          {({ x, y }) =>
            shown.map((driver) => {
              const runs: { lap: number; time: number }[][] = [];
              let run: { lap: number; time: number }[] = [];
              for (const lap of driver.laps) {
                if (lap.isOutlier) {
                  if (run.length > 0) runs.push(run);
                  run = [];
                  continue;
                }
                run.push(lap);
              }
              if (run.length > 0) runs.push(run);

              // A single clean lap between two cautions has nothing to stroke —
              // it is already drawn as a dot below — but it still ends and
              // starts a bridge, so the runs are kept whole and only the
              // strokeable ones are filtered here.
              const segments = runs.filter((entry) => entry.length > 1);
              // The gaps read as missing data otherwise. They are not: a pit
              // stop or a safety car took those laps out of the line, and the
              // driver kept driving. A faint dashed bridge carries the eye
              // across without pretending the laps in between were racing laps.
              const bridges = runs.slice(0, -1).map((entry, index) => ({
                from: entry[entry.length - 1],
                to: runs[index + 1][0],
              }));

              return (
                <g key={driver.id}>
                  {bridges.map((bridge) => (
                    <line
                      key={`${bridge.from.lap}-${bridge.to.lap}`}
                      x1={x(bridge.from.lap)}
                      y1={y(bridge.from.time)}
                      x2={x(bridge.to.lap)}
                      y2={y(bridge.to.time)}
                      stroke={driver.color}
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
                      strokeOpacity={0.35}
                    />
                  ))}
                  {segments.map((segment, index) => (
                    <motion.path
                      key={index}
                      d={linePath(segment.map((l) => ({ x: x(l.lap), y: y(l.time) })))}
                      fill="none"
                      stroke={driver.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  ))}
                  {driver.laps
                    // The domain is built from representative laps, so a
                    // thirty-second pit lap falls outside it. Those are left out
                    // of the drawing rather than pinned to the edge, where a row
                    // of dots along the top reads as a rendering fault. An
                    // outlier that *is* in range stays, faint — that is the
                    // safety-car lap, and seeing it is the point.
                    .filter((lap) => lap.time >= domain.y[0] && lap.time <= domain.y[1])
                    .map((lap) => (
                    <circle
                      key={lap.lap}
                      cx={x(lap.lap)}
                      cy={y(lap.time)}
                      r={lap.isOutlier ? 1.5 : 2}
                      fill={driver.color}
                      opacity={lap.isOutlier ? 0.3 : 1}
                    >
                      <title>
                        {`${driver.code} — lap ${lap.lap}, ${formatLapTime(lap.time)}${
                          lap.isOutlier ? " (pit, out-lap or caution)" : ""
                        }`}
                      </title>
                    </circle>
                  ))}
                </g>
              );
            })
          }
        </ChartFrame>
      </div>
    </div>
  );
}
