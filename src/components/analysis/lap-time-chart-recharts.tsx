"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";
import { formatLapTime } from "@/lib/scale";
import type { LapTimeSeries } from "./lap-time-chart";

/**
 * SPIKE — the same chart as `lap-time-chart.tsx`, drawn with Recharts, so the
 * two can be compared on the same data rather than in the abstract. Not wired
 * into the site; delete this file or the other one once the question is settled.
 */

const DEFAULT_SELECTED = 5;

type Row = Record<string, number | null> & { lap: number };

export function LapTimeChartRecharts({ series }: { series: LapTimeSeries[] }) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<string[]>(() =>
    series.slice(0, DEFAULT_SELECTED).map((s) => s.id),
  );
  const shown = series.filter((s) => selected.includes(s.id));

  // Recharts is row-oriented — one object per x value with a field per series —
  // so the per-driver arrays have to be pivoted. Two fields per driver: the
  // clean time (null on an outlier, which is what breaks the line) and the
  // outlier time (null otherwise, which is what draws the faint dot).
  const { rows, domain } = useMemo(() => {
    // Two passes, and the second one is not optional. Recharts sizes an axis to
    // every series drawn on it, so a thirty-second pit lap plotted as a faint
    // dot drags the domain with it and flattens the two seconds that separate
    // the drivers — the hand-rolled chart avoids this by filtering the dots
    // against the domain, which means the domain has to exist first.
    const times: number[] = [];
    for (const driver of series) {
      for (const lap of driver.laps) {
        if (!lap.isOutlier) times.push(lap.time);
      }
    }
    if (times.length === 0) return { rows: [], domain: null };

    const pad = (Math.max(...times) - Math.min(...times)) * 0.08 || 0.5;
    const bounds: [number, number] = [Math.min(...times) - pad, Math.max(...times) + pad];

    const byLap = new Map<number, Row>();
    for (const driver of series) {
      for (const lap of driver.laps) {
        const row = byLap.get(lap.lap) ?? ({ lap: lap.lap } as Row);
        row[`${driver.id}_clean`] = lap.isOutlier ? null : lap.time;
        row[`${driver.id}_outlier`] =
          lap.isOutlier && lap.time >= bounds[0] && lap.time <= bounds[1] ? lap.time : null;
        byLap.set(lap.lap, row);
      }
    }

    return {
      rows: [...byLap.values()].sort((a, b) => a.lap - b.lap),
      domain: bounds,
    };
  }, [series]);

  // The dashed bridges have no Recharts equivalent: `connectNulls` joins every
  // gap including the ones that are not bridges, so each one is drawn as its
  // own `ReferenceLine` segment.
  const bridges = useMemo(
    () =>
      shown.flatMap((driver) => {
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

        return runs.slice(0, -1).map((entry, index) => ({
          id: `${driver.id}-${index}`,
          color: driver.color,
          from: entry[entry.length - 1],
          to: runs[index + 1][0],
        }));
      }),
    [shown],
  );

  if (!domain) {
    return <p className="text-sm text-muted">No lap times were recorded for this race.</p>;
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

      <div className="mt-4 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 24, left: 24 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="lap"
              type="number"
              domain={["dataMin", "dataMax"]}
              stroke="var(--muted)"
              fontSize={11}
            >
              <Label value="Lap" position="insideBottom" offset={-16} fill="var(--muted)" />
            </XAxis>
            <YAxis
              domain={domain}
              allowDataOverflow
              tickFormatter={(value: number) => formatLapTime(value)}
              stroke="var(--muted)"
              fontSize={11}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                fontSize: 12,
              }}
              // Recharts types the tooltip callbacks as `ValueType`/`NameType`
              // unions, so both arguments have to be narrowed by hand.
              labelFormatter={(label) => `Lap ${String(label)}`}
              formatter={(value, name) => [formatLapTime(Number(value)), String(name)]}
            />

            {bridges.map((bridge) => (
              <ReferenceLine
                key={bridge.id}
                segment={[
                  { x: bridge.from.lap, y: bridge.from.time },
                  { x: bridge.to.lap, y: bridge.to.time },
                ]}
                stroke={bridge.color}
                strokeWidth={1.5}
                strokeDasharray="3 4"
                strokeOpacity={0.35}
              />
            ))}

            {shown.map((driver) => (
              <Line
                key={driver.id}
                dataKey={`${driver.id}_clean`}
                name={driver.code}
                type="linear"
                stroke={driver.color}
                strokeWidth={2}
                dot={{ r: 2, fill: driver.color, stroke: "none" }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={!reduceMotion}
              />
            ))}

            {shown.map((driver) => (
              <Line
                key={`${driver.id}-outliers`}
                dataKey={`${driver.id}_outlier`}
                name={driver.code}
                stroke="none"
                dot={{ r: 1.5, fill: driver.color, fillOpacity: 0.3, stroke: "none" }}
                activeDot={false}
                legendType="none"
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
