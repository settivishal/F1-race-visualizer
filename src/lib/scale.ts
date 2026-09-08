/**
 * The two pieces of chart maths every chart here needs: map a value into pixels,
 * and choose axis ticks a person would have chosen.
 *
 * This is where `d3-scale` would normally go. It is thirty lines and no runtime
 * dependency instead, because everything on this site is a linear scale over
 * numbers — laps against seconds — and a package that also does time, log,
 * quantile, ordinal and diverging scales would earn its place only if any of
 * those were coming.
 */

export type Scale = (value: number) => number;

/** Maps [domainMin, domainMax] onto [rangeMin, rangeMax]. */
export function linearScale(
  [d0, d1]: [number, number],
  [r0, r1]: [number, number],
): Scale {
  // A zero-width domain would divide by zero. One value still has to land
  // somewhere sensible, and the middle of the range is the honest place.
  if (d1 === d0) return () => (r0 + r1) / 2;
  const ratio = (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * ratio;
}

/**
 * Round tick values covering the domain — steps of 1, 2, 5 or 10 times a power
 * of ten, which is what makes an axis readable rather than technically correct.
 * `count` is a target, not a promise; the rounding decides the rest.
 */
export function niceTicks([min, max]: [number, number], count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];

  const rawStep = (max - min) / Math.max(1, count);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step / 1e6; tick += step) {
    // Floating-point accumulation gives 90.30000000000001; the step's own
    // precision is the right number of decimals to keep.
    ticks.push(Number(tick.toFixed(precisionOf(step))));
  }
  return ticks;
}

function precisionOf(step: number): number {
  const exponent = Math.floor(Math.log10(step));
  return exponent >= 0 ? 0 : Math.min(-exponent, 10);
}

/** An SVG polyline path through points already in pixel space. */
export function linePath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

/** m:ss.mmm — how a lap time is read everywhere in the sport. */
export function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return minutes > 0
    ? `${minutes}:${rest.toFixed(3).padStart(6, '0')}`
    : rest.toFixed(3);
}
