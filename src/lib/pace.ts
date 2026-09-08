/**
 * Pace statistics over a race's lap times.
 *
 * Pure, like `lib/ingest/transform.ts` and for the same reason: the interesting
 * part is which laps get thrown away, and that is worth testing by calling it
 * with numbers rather than by reading a chart.
 *
 * The whole problem is that a race's lap times are not a sample of a driver's
 * pace. A pit lap is thirty seconds slow, a safety-car lap is twenty, and a
 * driver who spent nine laps behind a train of cars was not driving to his own
 * limit. Averaged raw, a two-stop strategy looks slower than a one-stop
 * regardless of how the car was driven.
 */

export type LapTime = { lap: number; time: number };

/** Laps slower than this multiple of a driver's own median are set aside. */
export const OUTLIER_THRESHOLD = 1.07;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Which laps do not represent the driver's pace.
 *
 * Two rules, in this order. A lap on which the driver pitted, and the next lap
 * they actually recorded, are excluded outright — those are the in-lap and the
 * out-lap, and they are slow for a reason that has nothing to do with pace. The
 * out-lap is "the next lap present" rather than "pit lap + 1" because upstream
 * leaves whole lap ranges missing, and in that case lap + 1 does not exist while
 * the out-lap still does.
 *
 * Everything else is compared against the driver's *own* median rather than the
 * field's, so a backmarker is judged against a backmarker and a safety-car
 * period drops out for everybody at once.
 *
 * The median has to be computed from the already-pit-filtered set: a driver with
 * three stops in a twenty-lap sprint would otherwise drag their own baseline
 * slow enough that the pit laps look normal.
 */
export function markOutliers(
  laps: LapTime[],
  pitLaps: Iterable<number> = [],
  threshold = OUTLIER_THRESHOLD,
): (LapTime & { isOutlier: boolean })[] {
  const numbers = [...laps].map((l) => l.lap).sort((a, b) => a - b);
  const affected = new Set<number>();
  for (const lap of pitLaps) {
    affected.add(lap);
    const outLap = numbers.find((n) => n > lap);
    if (outLap !== undefined) affected.add(outLap);
  }

  const clean = laps.filter((l) => !affected.has(l.lap)).map((l) => l.time);
  const baseline = median(clean);

  return laps.map((l) => ({
    ...l,
    isOutlier:
      affected.has(l.lap) || (baseline !== null && l.time > baseline * threshold),
  }));
}

export type PaceSummary = {
  /** Quickest lap of the race, outliers included — a fast lap is never noise. */
  best: number | null;
  /** Middle of the representative laps. The headline pace number. */
  median: number | null;
  mean: number | null;
  /**
   * Standard deviation of the representative laps: how repeatably the driver
   * hit that pace. Two drivers can share a median and not be comparable.
   */
  consistency: number | null;
  lapsCounted: number;
  lapsExcluded: number;
};

export function summarizePace(
  laps: LapTime[],
  pitLaps: Iterable<number> = [],
): PaceSummary {
  const marked = markOutliers(laps, pitLaps);
  const kept = marked.filter((l) => !l.isOutlier).map((l) => l.time);
  const all = laps.map((l) => l.time);

  const mid = median(kept);
  const mean = kept.length ? kept.reduce((sum, t) => sum + t, 0) / kept.length : null;
  const consistency =
    kept.length > 1 && mean !== null
      ? Math.sqrt(kept.reduce((sum, t) => sum + (t - mean) ** 2, 0) / (kept.length - 1))
      : null;

  return {
    best: all.length ? Math.min(...all) : null,
    median: mid,
    mean,
    consistency,
    lapsCounted: kept.length,
    lapsExcluded: marked.length - kept.length,
  };
}
