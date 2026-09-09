"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ReplayEntry, ReplayEvent, ReplayPosition, ReplaySummary, ReplayView } from "./types";
import { RaceCar } from "./race-car";
import { TIMING_TOWER_ID } from "./live-timing-tower";
import {
  classifyReplayEvent,
  type ReplayEventKind,
  DriverReplayState,
  getReplayEventMarkerColor,
  ReplayRaceControl,
  withFocusLast,
} from "./replay-state";
import { motion, MotionValue, useTransform } from "framer-motion";

const VIEWBOX_WIDTH = 1120;
const VIEWBOX_HEIGHT = 640;
const MARGIN = {
  top: 80,
  // The driver badges ride the playhead rather than sitting at the right edge,
  // so this only has to clear the last lap label.
  right: 56,
  // The last row sits exactly on top + innerHeight, so its label needs room
  // below the plot or it is clipped by the container — P18 was rendering as a
  // half-height label on an eighteen-car race.
  bottom: 96,
  // "P18" is four characters. 176 spent a sixth of the chart's width on it.
  left: 96,
};

/**
 * The signals that describe the race rather than one car, and so earn a rule
 * across the whole plot.
 */
const RACE_CONTROL_KINDS = new Set<ReplayEventKind>([
  "safety-car",
  "virtual-safety-car",
  "red-flag",
  "yellow",
  "double-yellow",
  "chequered",
  "green",
]);

/** Race control plus the non-finishes: a line that stops should say why. */
const CHART_EVENT_KINDS = new Set<ReplayEventKind>([
  ...RACE_CONTROL_KINDS,
  "dnf",
  "dns",
  "dsq",
]);

/**
 * The lap axis, over a window rather than always the whole race.
 *
 * The chart used to be a fixed 760px minimum and pan inside a scrolling box. On
 * a phone that meant scrolling in two directions to read one race, which is the
 * kind of thing that is fine in a design review and awful in a hand.
 *
 * So the axis shows as many laps as fit at a legible spacing, centred on
 * wherever the replay is, and moves with it. Fewer laps on screen rather than
 * thinner lines — and on a desktop the window is the whole race, so nothing
 * changes there.
 */
export type LapWindow = { from: number; to: number };

type LapScale = (lap: number) => number;

function makeLapX({ from, to }: LapWindow): LapScale {
  const innerWidth = VIEWBOX_WIDTH - MARGIN.left - MARGIN.right;
  const span = to - from;

  if (span <= 0) {
    return () => MARGIN.left + innerWidth / 2;
  }

  return (lap: number) => MARGIN.left + ((lap - from) / span) * innerWidth;
}

/** Laps per screen at a spacing a finger and an eye can both deal with. */
const MIN_LAP_SPACING = 16;

export function lapWindowFor(containerWidth: number, currentLap: number, maxLap: number): LapWindow {
  if (containerWidth <= 0) return { from: 1, to: Math.max(2, maxLap) };

  // The viewBox is scaled to the container, so a lap's spacing on screen is its
  // spacing in viewBox units times that ratio.
  const scale = containerWidth / VIEWBOX_WIDTH;
  const usable = (VIEWBOX_WIDTH - MARGIN.left - MARGIN.right) * scale;
  const fits = Math.max(6, Math.floor(usable / MIN_LAP_SPACING));

  if (fits >= maxLap) return { from: 1, to: Math.max(2, maxLap) };

  // Centred on the current lap, then pushed back inside the race at both ends
  // so the window never runs off either edge.
  const half = Math.floor(fits / 2);
  let from = Math.max(1, currentLap - half);
  const to = Math.min(maxLap, from + fits);
  from = Math.max(1, to - fits);

  return { from, to };
}

function getPositionY(position: number, maxPosition: number) {
  const innerHeight = VIEWBOX_HEIGHT - MARGIN.top - MARGIN.bottom;

  if (maxPosition <= 1) {
    return MARGIN.top + innerHeight / 2;
  }

  return MARGIN.top + ((position - 1) / (maxPosition - 1)) * innerHeight;
}

function buildPath(
  positions: ReplayPosition[],
  lapX: LapScale,
  maxPosition: number,
) {
  return positions
    .map((entry, index) => {
      const x = lapX(entry.lap);
      const y = getPositionY(entry.position, maxPosition);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getPointForLap(
  positions: ReplayPosition[],
  lap: number,
) {
  let candidate = positions[0];

  for (const entry of positions) {
    if (entry.lap === lap) {
      return entry;
    }

    if (entry.lap < lap) {
      candidate = entry;
    }
  }

  return candidate ?? positions[0];
}

function getVisibleLapTicks(laps: number[]) {
  if (laps.length <= 12) {
    return laps;
  }

  const step = Math.ceil(laps.length / 8);
  return laps.filter((_, index) => index === 0 || index === laps.length - 1 || index % step === 0);
}

function isRetirementKind(event: ReplayEvent) {
  const kind = classifyReplayEvent(event);
  return kind === "dnf" || kind === "dns" || kind === "dnq" || kind === "dsq";
}

function getRetirementLapByDriver(events: ReplayEvent[]) {
  const result = new Map<string, ReplayEvent>();

  for (const event of events) {
    if (!event.driver || !isRetirementKind(event)) {
      continue;
    }

    const existing = result.get(event.driver.id);
    if (!existing || event.lap < existing.lap) {
      result.set(event.driver.id, event);
    }
  }

  return result;
}

function getRetiredMarkerOffset(index: number) {
  const offsets = [
    { x: -12, y: -13 },
    { x: 12, y: -13 },
    { x: -12, y: 13 },
    { x: 12, y: 13 },
    { x: 0, y: -22 },
    { x: 0, y: 22 },
  ];

  return offsets[index % offsets.length];
}

export function RaceVisualizationCanvas({
  visualization,
  currentLap,
  nextLap,
  lapProgress,
  raceControl,
  driverStates,
  controls,
  className,
  focusedDriverId,
  onToggleDriver,
}: {
  visualization: ReplayView;
  currentLap: number;
  nextLap: number;
  lapProgress: MotionValue<number>;
  raceControl: ReplayRaceControl;
  driverStates: Map<string, DriverReplayState>;
  controls?: ReactNode;
  className?: string;
  /** The driver drawn at full strength; every other line is dimmed. */
  focusedDriverId: string | null;
  onToggleDriver: (driverId: string) => void;
}) {
  const { race, summary, laps, drivers } = visualization;

  // The chart measures itself so the window suits the space it actually has,
  // rather than a breakpoint guessing at it.
  const frame = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const lapWindow = useMemo(
    () => lapWindowFor(frameWidth, currentLap, summary.maxLap || race.laps),
    [frameWidth, currentLap, summary.maxLap, race.laps],
  );
  const lapX = useMemo(() => makeLapX(lapWindow), [lapWindow]);

  // Only the ticks inside the window, or a windowed chart labels laps it is not
  // showing.
  const lapTicks = getVisibleLapTicks(
    laps.filter((lap) => lap >= lapWindow.from && lap <= lapWindow.to),
  );
  const activeLapX = useTransform(lapProgress, (p) => lapX(currentLap + (nextLap - currentLap) * p));
  const retirementEventByDriver = useMemo(
    () => getRetirementLapByDriver(visualization.events),
    [visualization.events],
  );

  const chartEvents = useMemo(
    () =>
      visualization.events
        .map((event, index) => ({ event, index, kind: classifyReplayEvent(event) }))
        .filter(({ kind }) => CHART_EVENT_KINDS.has(kind)),
    [visualization.events],
  );

  const currentDriverFrames = useMemo(
    () =>
      drivers.map((entry, index) => {
        const retirementEvent = retirementEventByDriver.get(entry.driver.id);
        const retirementLap = retirementEvent?.lap ?? null;
        const isRetiredAtCurrentLap = retirementLap !== null && currentLap >= retirementLap;
        const isCarActive = retirementLap === null || currentLap < retirementLap;
        const visiblePositions = entry.positions.filter(
          (position) => retirementLap === null || position.lap <= retirementLap,
        );
        const currentPoint = getPointForLap(entry.positions, currentLap);
        const nextPoint = getPointForLap(entry.positions, isCarActive ? nextLap : currentLap);
        const markerPoint =
          retirementLap !== null ? getPointForLap(entry.positions, retirementLap) : null;
        const fullPath = buildPath(visiblePositions, lapX, summary.maxPosition);
        const trail = buildPath(
          visiblePositions.filter((position) => position.lap <= currentLap),
          lapX,
          summary.maxPosition,
        );
        const markerOffset = getRetiredMarkerOffset(index);

        return {
          entry,
          currentPoint,
          fullPath,
          isCarActive,
          isRetiredAtCurrentLap,
          markerOffset,
          markerPoint,
          nextPoint,
          retirementEvent,
          trail,
        };
      }),
    [
      currentLap,
      drivers,
      lapX,
      nextLap,
      retirementEventByDriver,
      summary.maxPosition,
    ],
  );
  const retiredFrames = currentDriverFrames.filter((frame) => frame.isRetiredAtCurrentLap);
  const activeFrames = currentDriverFrames.filter((frame) => !frame.isRetiredAtCurrentLap);
  const focusedDriver = drivers.find((entry) => entry.driver.id === focusedDriverId)?.driver ?? null;

  return (
    // `bg-track` and the white text on it are deliberate in both themes. The
    // chart is twenty coloured lines whose only job is to be told apart, and a
    // light ground washes the team colours out — so this panel stays a dark
    // instrument on a light page, the way a video player does. It is the one
    // surface here that does not follow the theme.
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-line-strong bg-track p-5 text-white shadow-lg", className)}>
      <div className="border-b border-white/10 px-4 pb-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          {/* min-w-0 so a long race name wraps instead of pushing the controls
              off; the chips used to live in here and inherited the squeeze. */}
          <div className="min-w-0 max-w-xl flex-1">
            <p className="text-eyebrow font-bold uppercase text-on-track-accent">Visualization Engine</p>
            <h3 className="font-heading mt-2 break-words text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {race.season} R{race.round} • {race.name}
            </h3>
          </div>
          <div className="flex flex-col items-start gap-3 md:flex-shrink-0 md:items-end">
            {controls ? <div>{controls}</div> : null}
          </div>
        </div>

        {/* Their own row, full width. In the title's column they were sharing
            space with a flex-shrink-0 sibling and wrapped one-then-two. */}
        <div className="mt-3.5 flex flex-wrap gap-2 text-xs">
          <span className="tabular rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-white/90">
            {summary.driverCount} Drivers
          </span>
          <span className="tabular rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-white/90">
            {summary.maxLap || race.laps} Laps
          </span>
          <span className="tabular rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-white/90">
            {/* What the chart draws, not what the race recorded — a "186
                Events" chip above five visible markers reads as a bug. The
                full count is the timeline's business. */}
            {chartEvents.length} Flags
          </span>
        </div>

        {/* The second way in to the same state — the timing tower's rows are
            the first. Same chip shape as the row above so the dark panel keeps
            one vocabulary, rather than importing the analysis tab's chips,
            which live on a light surface and hold a different kind of state. */}
        <ul data-testid="driver-chips" className="mt-2.5 flex flex-wrap gap-1.5">
          {drivers.map((entry) => {
            const isFocused = entry.driver.id === focusedDriverId;

            return (
              <li key={entry.driver.id}>
                <button
                  type="button"
                  aria-pressed={isFocused}
                  onClick={() => onToggleDriver(entry.driver.id)}
                  className={cn(
                    "tabular inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                    isFocused
                      ? "border-white/45 bg-white/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.team.color }}
                    aria-hidden
                  />
                  {entry.driver.code}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* min-h-0 so this can shrink inside the card's flex column: without it
          an `h-auto` SVG keeps its intrinsic height, the column overflows the
          card's max height, and the bottom of the chart is cropped — which is
          what cut P18 in half on an eighteen-car race. */}
      {/* Focusable because it scrolls: a region a mouse can pan and a keyboard
          cannot reach is unusable without a pointer, which is what axe's
          scrollable-region-focusable rule is about. The chart itself carries the
          label, so this is a scroll handle rather than a second announcement. */}
      {/* No min-width and no scrolling any more. The chart shows a window of
          laps sized to this box, so it fits whatever space it is given rather
          than making the reader pan a 760px canvas on a 390px screen. */}
      <div ref={frame} className="mt-4 min-h-0 flex-1">
        <div className="h-full">
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            role="img"
            // The focus is named here as well, because dimming nineteen lines
            // is a change to the picture and `role="img"` is all a screen
            // reader has of it.
            aria-label={`${race.name} race position chart, lap ${currentLap} of ${
              summary.maxLap || race.laps
            }${focusedDriver ? `, focused on ${focusedDriver.name}` : ''}`}
            aria-describedby={TIMING_TOWER_ID}
            // `meet` letterboxes rather than crops, so a short container makes
            // a smaller chart instead of a clipped one.
            preserveAspectRatio="xMidYMid meet"
            className="h-full max-h-full w-full"
          >
            {/* Dark background panel */}
            <rect
              x="0"
              y="0"
              width={VIEWBOX_WIDTH}
              height={VIEWBOX_HEIGHT}
              rx="28"
              fill="var(--track)"
            />

            {/* Glowing active lap scrubber line */}
            <motion.line
              style={{ x: activeLapX }}
              y1={MARGIN.top - 32}
              y2={VIEWBOX_HEIGHT - MARGIN.bottom}
              stroke="var(--accent)"
              strokeWidth="2.5"
              opacity="0.85"
              
            />
            {/* Top glowing handle for active line */}
            <motion.g style={{ x: activeLapX, y: MARGIN.top - 32 }}>
              <circle r="6" fill="var(--accent)" />
              <circle r="2.5" fill="white" />
            </motion.g>

            {/* Horizontal position grid lines */}
            {Array.from({ length: summary.maxPosition }, (_, index) => {
              const position = index + 1;
              const y = getPositionY(position, summary.maxPosition);

              return (
                <g key={`position-${position}`}>
                  <line
                    x1={MARGIN.left}
                    y1={y}
                    x2={VIEWBOX_WIDTH - MARGIN.right}
                    y2={y}
                    stroke={position === 1 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.045)"}
                    strokeWidth="1"
                  />
                  <text
                    x={MARGIN.left - 42}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="13"
                    fontWeight="700"
                    fill="rgba(255,255,255,0.68)"
                    style={{ fontFamily: "monospace" }}
                  >
                    P{position}
                  </text>
                </g>
              );
            })}

            {/* Vertical lap grid lines */}
            {lapTicks.map((lap) => {
              const x = lapX(lap);

              return (
                <g key={`lap-${lap}`}>
                  <line
                    x1={x}
                    y1={MARGIN.top}
                    x2={x}
                    y2={VIEWBOX_HEIGHT - MARGIN.bottom}
                    stroke="rgba(255,255,255,0.045)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={VIEWBOX_HEIGHT - MARGIN.bottom + 28}
                    textAnchor="middle"
                    fontSize="12"
                    fill="rgba(255,255,255,0.68)"
                    style={{ fontFamily: "monospace" }}
                  >
                    Lap {lap}
                  </text>
                </g>
              );
            })}

            {/* Race control, and only race control.
                This drew a dot and a full-height dashed line for every event,
                which on a race carrying 186 of them — the archive files an
                overtake per position change — put the plot behind a curtain.
                What earns a rule across the whole chart is a signal that
                applies to the whole chart: a safety car, a red flag, the
                chequered. Retirements keep a dot, because a line that stops
                should say why. Everything else is in the timeline below, which
                is the place built for listing things. */}
            {chartEvents.map(({ event, kind, index: eventIndex }) => {
              const cx = lapX(event.lap);
              const color = getReplayEventMarkerColor(kind);
              const isRaceControl = RACE_CONTROL_KINDS.has(kind);

              return (
                <g key={`${event.lap}-${event.type}-${eventIndex}`}>
                    {isRaceControl ? (
                      <line
                        x1={cx}
                        y1={MARGIN.top - 48}
                        x2={cx}
                        y2={VIEWBOX_HEIGHT - MARGIN.bottom}
                        stroke={color}
                        strokeOpacity="0.25"
                        strokeDasharray="4 4"
                      />
                    ) : null}
                    <circle
                      cx={cx}
                      cy={MARGIN.top - 48}
                      r="6"
                      fill="var(--track)"
                      stroke={color}
                      strokeWidth="2"
                    />
                    <circle cx={cx} cy={MARGIN.top - 48} r="2" fill={color} />
                </g>
              );
            })}

            {/* Render trails and active telemetry badges */}
            {withFocusLast([...retiredFrames, ...activeFrames], focusedDriverId).map((frame) => {
              const state = driverStates.get(frame.entry.driver.id);
              return (
                <AnimatedCar
                  key={frame.entry.driver.id}
                  frame={frame}
                  state={state}
                  isDimmed={focusedDriverId !== null && frame.entry.driver.id !== focusedDriverId}
                  raceControl={raceControl}
                  lapProgress={lapProgress}
                  summary={summary}
                  currentLap={currentLap}
                  nextLap={nextLap}
                  lapX={lapX}
                />
              );
            })}
          </svg>
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 px-4 pt-5 text-eyebrow font-bold uppercase text-white/45 lg:grid-cols-[1fr_auto] lg:items-center">
        <p>
          The replay controller drives car positions, lap progress, and event markers from the same
          synchronized race state.
        </p>
        {/* The race-control label lives in the story strip directly below;
            printing it here as well said the same thing twice on one screen. */}
        {/* on-track-accent, not accent: this panel is a fixed dark surface in
            both themes, and the theme's own accent lands on it at 3.7:1 in
            light mode. */}
        <p className="text-on-track-accent">
          Lap {currentLap}
          {nextLap !== currentLap ? ` → ${nextLap}` : ""}
        </p>
      </div>
    </div>
  );
}

type DriverFrame = {
  entry: ReplayEntry;
  currentPoint: ReplayPosition;
  fullPath: string;
  isCarActive: boolean;
  isRetiredAtCurrentLap: boolean;
  markerOffset: { x: number; y: number };
  markerPoint: ReplayPosition | null;
  nextPoint: ReplayPosition;
  retirementEvent: ReplayEvent | undefined;
  trail: string;
};

function AnimatedCar({
  frame,
  state,
  isDimmed,
  raceControl,
  lapProgress,
  summary,
  currentLap,
  nextLap,
  lapX,
}: {
  frame: DriverFrame;
  state?: DriverReplayState;
  /** True when another driver is focused: this one drops back, it does not go. */
  isDimmed: boolean;
  raceControl: ReplayRaceControl;
  lapProgress: MotionValue<number>;
  summary: ReplaySummary;
  currentLap: number;
  nextLap: number;
  lapX: LapScale;
}) {
  const {
    entry,
    currentPoint,
    fullPath,
    isCarActive,
    isRetiredAtCurrentLap,
    markerOffset,
    markerPoint,
    nextPoint,
    retirementEvent,
    trail,
  } = frame;
  const { driver, team, positions } = entry;
  const first = positions[0];
  const last = positions[positions.length - 1];

  // A multiplier rather than a replacement, so the weights the chart already
  // draws — a retired line fainter than a running one, a backmarker fainter
  // than the lead pack — survive being dimmed instead of flattening to one
  // value.
  const dim = isDimmed ? 0.3 : 1;

  const x = useTransform(lapProgress, (p) => {
    return lapX(isCarActive ? currentLap + (nextLap - currentLap) * p : currentLap);
  });

  const y = useTransform(lapProgress, (p) => {
    const interpolatedPosition =
      currentPoint && nextPoint
        ? currentPoint.position + (nextPoint.position - currentPoint.position) * p
        : currentPoint?.position ?? nextPoint?.position ?? 1;
    return getPositionY(interpolatedPosition, summary.maxPosition);
  });

  if (!first || !last || !fullPath || !currentPoint || !nextPoint) {
    return null;
  }

  return (
    <g>
      {/* One string, not an expression list: React treats `title` children as
          text and warns when handed an array of more than one child. */}
      <title>
        {[
          `${driver.code} • ${driver.name}`,
          state?.statusLabel,
          retirementEvent && `${retirementEvent.type} lap ${retirementEvent.lap}`,
        ]
          .filter(Boolean)
          .join(" • ")}
      </title>
      <path
        d={fullPath}
        fill="none"
        stroke={team.color}
        strokeOpacity={(isRetiredAtCurrentLap ? 0.08 : state?.isBackmarker ? 0.08 : 0.12) * dim}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 8"
        className="transition-opacity duration-200 hover:opacity-90"
      />

      {trail ? (
        <path
          d={trail}
          fill="none"
          stroke={team.color}
          strokeOpacity={(isRetiredAtCurrentLap ? 0.36 : state?.isBackmarker ? 0.5 : 0.8) * dim}
          strokeWidth={state?.isLapped ? "2.5" : isRetiredAtCurrentLap ? "2.2" : "3.2"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={state?.isLapped ? "8 6" : undefined}
          className="transition-opacity duration-200 hover:opacity-100"
        />
      ) : null}

      {isRetiredAtCurrentLap && markerPoint ? (
        <g
          transform={`translate(${
            lapX(markerPoint.lap) + markerOffset.x
          } ${getPositionY(markerPoint.position, summary.maxPosition) + markerOffset.y})`}
          className="transition-opacity duration-200 hover:opacity-100"
          opacity={0.9 * dim}
        >
          <circle r="8" fill="rgba(15,23,42,0.92)" stroke={team.color} strokeWidth="2.2" />
          <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ) : null}

      {isCarActive ? (
        // The badge is the loudest thing on the chart, so dimming it by the
        // same factor as the lines is what actually makes a focused driver
        // stand out. `muted` stays what it always was — a backmarker — and the
        // two compound for a backmarker who is not the focused driver.
        <g opacity={dim}>
        <RaceCar
          color={team.color}
          driverCode={driver.code}
          label={positions.length === 1 ? driver.name : undefined}
          x={x}
          y={y}
          accent={
            currentPoint.position > nextPoint.position
              ? "up"
              : currentPoint.position < nextPoint.position
                ? "down"
                : false
          }
          muted={Boolean(state?.isBackmarker)}
          caution={raceControl.status !== "green" || Boolean(state?.isLapped)}
        />
        </g>
      ) : null}
    </g>
  );
}
