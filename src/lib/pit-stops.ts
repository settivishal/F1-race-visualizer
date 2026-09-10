/**
 * Telling a pit stop apart from a red flag.
 *
 * OpenF1 publishes the whole stationary period of a race suspension as
 * `pit_duration`, so a red-flagged race arrives with a "pit stop" for the entire
 * field on the lap it was stopped — 2026 Monza has 21 of them at ~30 minutes
 * each. Counting those as strategy makes every driver's stop count one too high
 * and puts a three-lap sliver at the front of every tyre bar.
 *
 * The rows are kept verbatim, as upstream's points are: this decides what they
 * mean rather than rewriting them.
 *
 * The threshold is not a guess. Across every race imported, 2,822 stops are at
 * most 155 seconds (that longest one a real repair in the box), and the next
 * value in the data is 777 seconds. Five minutes sits in the middle of a gap
 * nothing occupies, which is what makes it safe.
 */
export const RACING_STOP_MAX_MS = 300_000;

/**
 * True for a stop the driver chose to make. A null duration counts as racing:
 * the archive path publishes stops without one, and treating an unknown as a
 * suspension would erase real stops from seasons that predate the field.
 */
export function isRacingStop(durationMs: number | null | undefined): boolean {
  return durationMs == null || durationMs <= RACING_STOP_MAX_MS;
}
