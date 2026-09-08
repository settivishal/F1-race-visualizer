"use client";

import { useMemo } from "react";
import { getReplayEventMarkerColor } from "./replay-state";
import type { StoryMoment } from "./story-moments";

/**
 * The race as a lap axis, directly under the canvas.
 *
 * The story used to be a scrolling box of cards below the whole player, which
 * said what happened but never where — a moment on lap 3 and a moment on lap 60
 * were two cards the same distance apart. Here position on the axis *is* the
 * lap, so a race with everything in the first ten laps looks different from one
 * that unravelled at the end.
 *
 * Every marker is a button that jumps the replay to its lap. The canvas already
 * draws markers for the same events with `getReplayEventMarkerColor`, and this
 * uses that function rather than a second palette, so a marker here and a marker
 * there cannot drift apart.
 */

/** Percent of the axis within which two markers are one target. */
const COLLISION_WINDOW = 1.6;

type Cluster = {
  /** Percent along the axis. */
  offset: number;
  lap: number;
  moments: StoryMoment[];
};

export function clusterMoments(
  moments: StoryMoment[],
  firstLap: number,
  lastLap: number,
): Cluster[] {
  const span = Math.max(1, lastLap - firstLap);
  const clusters: Cluster[] = [];

  for (const moment of moments) {
    const offset = ((moment.lap - firstLap) / span) * 100;
    const previous = clusters[clusters.length - 1];

    // Moments arrive lap-ordered, so only the last cluster can be within reach.
    // A safety car and the three stops it triggers land on one lap and would
    // otherwise stack into an unclickable pile.
    if (previous && offset - previous.offset <= COLLISION_WINDOW) {
      previous.moments.push(moment);
      continue;
    }

    clusters.push({ offset, lap: moment.lap, moments: [moment] });
  }

  return clusters;
}

export function RaceStoryTimeline({
  moments,
  laps,
  currentLap,
  activeMomentId,
  onJumpToLap,
}: {
  moments: StoryMoment[];
  laps: number[];
  currentLap: number;
  activeMomentId: string | null;
  onJumpToLap: (lap: number) => void;
}) {
  const firstLap = laps[0] ?? 1;
  const lastLap = laps[laps.length - 1] ?? firstLap;
  const clusters = useMemo(
    () => clusterMoments(moments, firstLap, lastLap),
    [moments, firstLap, lastLap],
  );

  const playhead = ((currentLap - firstLap) / Math.max(1, lastLap - firstLap)) * 100;

  return (
    <div className="rounded-xl border border-line bg-panel px-5 pb-4 pt-5">
      <div className="flex items-baseline justify-between text-eyebrow font-semibold uppercase text-muted">
        <span>Race timeline</span>
        <span className="tabular">
          {moments.length} {moments.length === 1 ? "moment" : "moments"}
        </span>
      </div>

      {/* Tall enough for a marker to sit above the rail and still be a
          comfortable target on a touchscreen. */}
      <div className="relative mt-4 h-11">
        <div className="absolute inset-x-0 top-8 h-1 rounded-full bg-panel-strong" />
        {/* The race so far, so the rail reads as filling up. */}
        <div
          className="absolute top-8 left-0 h-1 rounded-full bg-accent/50"
          style={{ width: `${Math.max(0, Math.min(100, playhead))}%` }}
        />

        {clusters.map((cluster) => {
          const isActive = cluster.moments.some((moment) => moment.id === activeMomentId);
          const isPast = cluster.lap <= currentLap;
          const label =
            cluster.moments.length === 1
              ? `${cluster.moments[0].title}, lap ${cluster.lap}`
              : `${cluster.moments.length} moments on lap ${cluster.lap}: ${cluster.moments
                  .map((moment) => moment.title)
                  .join(", ")}`;

          return (
            <button
              key={`${cluster.lap}-${cluster.moments[0].id}`}
              type="button"
              onClick={() => onJumpToLap(cluster.lap)}
              title={label}
              aria-label={label}
              className="group absolute top-0 -translate-x-1/2 rounded-sm px-1 pb-1 pt-0.5"
              style={{ left: `${cluster.offset}%` }}
            >
              {/* The stalk ties the dot to the rail; without it a row of dots
                  floats above the axis rather than belonging to it. */}
              <span
                aria-hidden
                className={`mx-auto block w-px transition-[height] ${
                  isActive ? "h-6" : "h-4 group-hover:h-6"
                }`}
                style={{ backgroundColor: getReplayEventMarkerColor(cluster.moments[0].eventKind) }}
              />
              <span
                aria-hidden
                className={`mx-auto mt-0.5 block rounded-full ring-2 ring-panel transition-transform group-hover:scale-125 ${
                  isActive ? "h-3 w-3 scale-125" : "h-2.5 w-2.5"
                } ${isPast ? "" : "opacity-45"}`}
                style={{ backgroundColor: getReplayEventMarkerColor(cluster.moments[0].eventKind) }}
              />
              {cluster.moments.length > 1 ? (
                <span
                  aria-hidden
                  className="tabular absolute -right-1.5 top-3.5 rounded-full bg-foreground px-1 text-[9px] font-bold leading-tight text-background"
                >
                  {cluster.moments.length}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* The playhead sits above the markers: it is the thing that moves. */}
        <div
          aria-hidden
          className="absolute top-6 h-5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
          style={{ left: `${Math.max(0, Math.min(100, playhead))}%` }}
        />
      </div>

      <div className="flex justify-between text-eyebrow font-semibold uppercase text-subtle">
        <span className="tabular">Lap {firstLap}</span>
        <span className="tabular">Lap {lastLap}</span>
      </div>
    </div>
  );
}
