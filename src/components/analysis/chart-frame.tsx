import type { ReactNode } from "react";
import { linearScale, niceTicks, type Scale } from "@/lib/scale";

export type Frame = {
  /** Pixel scales for the plot area. */
  x: Scale;
  y: Scale;
  width: number;
  height: number;
  plot: { left: number; top: number; right: number; bottom: number };
};

// Left is wide enough for a 1:30.000 tick label *and* the rotated axis label
// outside it; they overlapped at 56.
const PADDING = { left: 74, top: 16, right: 16, bottom: 34 };

/**
 * Axes, gridlines and labels, with the series drawn inside by the caller.
 *
 * Every chart on the site shares this so they read as one system: the same tick
 * density, the same muted gridlines, the same tabular labels. The caller gets
 * pixel scales back through a render prop rather than re-deriving them, which is
 * the whole reason the frame owns the domain.
 *
 * The SVG scales with its container and carries no fixed pixel size, so the
 * viewBox is the coordinate system and 390px-wide phones get the same chart
 * rather than a cropped one.
 */
export function ChartFrame({
  xDomain,
  yDomain,
  height = 320,
  width = 900,
  xLabel,
  yLabel,
  formatX = String,
  formatY = String,
  children,
  overlay,
  title,
}: {
  xDomain: [number, number];
  yDomain: [number, number];
  height?: number;
  width?: number;
  xLabel?: string;
  yLabel?: string;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  /** The series, drawn in pixel space through the scales handed back. */
  children: (frame: Frame) => ReactNode;
  /**
   * HTML drawn on top of the plot, in the same coordinate space — for the one
   * thing SVG is bad at, which is a box of styled text that has to follow a
   * pointer. Positioned by the caller as a percentage of `width`/`height`,
   * because the SVG scales with its container and pixels here are viewBox
   * units, not screen ones.
   */
  overlay?: (frame: Frame) => ReactNode;
  /** Read by screen readers in place of the drawing. */
  title: string;
}) {
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const x = linearScale(xDomain, [PADDING.left, PADDING.left + plotWidth]);
  // Inverted: SVG's y grows downward and a chart's does not.
  const y = linearScale(yDomain, [PADDING.top + plotHeight, PADDING.top]);

  const xTicks = niceTicks(xDomain, 8);
  const yTicks = niceTicks(yDomain, 5);

  const frame: Frame = {
    x,
    y,
    width,
    height,
    plot: {
      left: PADDING.left,
      top: PADDING.top,
      right: PADDING.left + plotWidth,
      bottom: PADDING.top + plotHeight,
    },
  };

  const svg = (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={title}
      preserveAspectRatio="xMidYMid meet"
    >
      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            x1={PADDING.left}
            x2={PADDING.left + plotWidth}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-line"
            strokeWidth={1}
          />
          <text
            x={PADDING.left - 10}
            y={y(tick)}
            dy="0.32em"
            textAnchor="end"
            className="tabular fill-muted text-[11px]"
          >
            {formatY(tick)}
          </text>
        </g>
      ))}

      {xTicks.map((tick) => (
        <text
          key={`x-${tick}`}
          x={x(tick)}
          y={PADDING.top + plotHeight + 20}
          textAnchor="middle"
          className="tabular fill-muted text-[11px]"
        >
          {formatX(tick)}
        </text>
      ))}

      {/* The axis lines themselves sit above the gridlines, darker. */}
      <line
        x1={PADDING.left}
        x2={PADDING.left + plotWidth}
        y1={PADDING.top + plotHeight}
        y2={PADDING.top + plotHeight}
        className="stroke-line-strong"
        strokeWidth={1}
      />

      {xLabel ? (
        <text
          x={PADDING.left + plotWidth / 2}
          y={height - 2}
          textAnchor="middle"
          className="fill-subtle text-[10px] font-semibold uppercase tracking-wider"
        >
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          transform={`translate(12 ${PADDING.top + plotHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-subtle text-[10px] font-semibold uppercase tracking-wider"
        >
          {yLabel}
        </text>
      ) : null}

      {children(frame)}
    </svg>
  );

  if (!overlay) return svg;

  return (
    <div className="relative">
      {svg}
      {/* pointer-events-none so the overlay never steals the pointer from the
          plot underneath, which is what is tracking it. */}
      <div className="pointer-events-none absolute inset-0">{overlay(frame)}</div>
    </div>
  );
}
