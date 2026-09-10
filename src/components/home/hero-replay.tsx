'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CountUp } from '@/components/home/count-up';
import { linePath, linearScale } from '@/lib/scale';

/**
 * The last race, as a chart you can drag — and, since the 2c wireframe, the
 * ground the hero copy stands on.
 *
 * Deliberately not the real replay. That is a timing tower, a play loop, event
 * markers and framer-motion — a bundle nobody asked for on a landing page. This
 * is polylines and a range input. Anyone who wants the real thing follows the
 * link, which carries the lap they left off at through `?lap=`.
 *
 * The copy arrives as `children` rather than as props: the page owns its own
 * words, and this owns the band they sit in.
 */

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = { left: 34, right: 44, top: 12, bottom: 12 };

export type HeroDriver = {
  code: string;
  color: string | null;
  positions: { lap: number; position: number }[];
};

export function HeroReplay({
  slug,
  title,
  drivers,
  maxLap,
  maxPosition,
  children,
}: {
  slug: string;
  title: string;
  drivers: HeroDriver[];
  maxLap: number;
  maxPosition: number;
  /** The hero copy, laid over the chart. */
  children?: ReactNode;
}) {
  // Opens at the end, showing the finished race. Starting at lap one would open
  // on a vertical line of grid slots, which says nothing about anything.
  const [lap, setLap] = useState(maxLap);
  // Once the reader drags, the counter is theirs — a number counting up under a
  // thumb they are holding reads as a bug.
  const [scrubbed, setScrubbed] = useState(false);

  const x = linearScale([1, Math.max(2, maxLap)], [PADDING.left, WIDTH - PADDING.right]);
  // Scaled to the positions actually drawn, not to the whole field: the hero
  // shows the ten who finished best, and scaling to a grid of twenty left the
  // bottom third of a full-bleed band empty.
  const deepest = drivers.reduce(
    (low, driver) => driver.positions.reduce((n, point) => Math.max(n, point.position), low),
    2,
  );
  // Inverted: P1 belongs at the top, and SVG's y grows downward.
  const y = linearScale(
    [1, Math.min(Math.max(2, maxPosition), deepest)],
    [PADDING.top, HEIGHT - PADDING.bottom],
  );

  return (
    <figure className="relative m-0 overflow-hidden border-y border-line bg-track">
      {/* The chart, filling the band. `aria-hidden` because the copy above it
          says what it shows and the link below reaches the real thing — an SVG
          of twenty polylines has no reading a screen reader wants. */}
      <div className="pointer-events-none absolute inset-0 sm:inset-y-0">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
          role="img"
          aria-label={`Position changes through lap ${lap} of the ${title}`}
        >
          {drivers.map((driver, index) => {
            const upTo = driver.positions.filter((point) => point.lap <= lap);
            if (upTo.length === 0) return null;
            const points = upTo.map((point) => ({ x: x(point.lap), y: y(point.position) }));
            const last = points[points.length - 1];

            return (
              <g key={driver.code}>
                <path
                  d={linePath(points)}
                  fill="none"
                  stroke={driver.color ?? '#8892a0'}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  // Drawn in, staggered, once on load. Pure CSS, so the global
                  // reduced-motion rule already switches it off. pathLength
                  // normalises the dash maths across races of any length.
                  pathLength={1}
                  className="hero-line"
                  style={{ animationDelay: `${index * 0.08}s` }}
                />
                {/* The car, at the lap the scrubber is on. */}
                <circle cx={last.x} cy={last.y} r={3} fill={driver.color ?? '#8892a0'} />
                <text
                  x={last.x + 7}
                  y={last.y}
                  dy="0.32em"
                  className="fill-white/70 text-[9px] font-semibold"
                >
                  {driver.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* The scrim. Without it the headline sits on whatever colour a driver's
          line happens to be, which is a contrast failure that moves. */}
      <div
        aria-hidden
        // Heavier on a phone, where the copy covers the whole band rather than
        // its left half and every line runs behind a word.
        className="absolute inset-0 bg-gradient-to-r from-track via-track/90 to-track/75 sm:via-track/85 sm:to-transparent"
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-28 pt-16 sm:pb-24 sm:pt-24">
        {children}
      </div>

      {/* The control rail, pinned to the band's bottom edge. */}
      <div className="absolute inset-x-0 bottom-0 border-t border-line-strong bg-track/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3">
          <label className="flex-1">
            <span className="sr-only">Lap</span>
            <input
              type="range"
              min={1}
              max={Math.max(1, maxLap)}
              value={lap}
              onChange={(event) => {
                setScrubbed(true);
                setLap(Number(event.target.value));
              }}
              className="w-full accent-accent"
            />
          </label>
          <span className="tabular shrink-0 text-eyebrow font-bold uppercase text-white/70">
            Lap{' '}
            {scrubbed ? lap : <CountUp value={lap} from={1} />}/{maxLap}
          </span>
          <Link
            href={`/races/${slug}?lap=${lap}`}
            className="hidden shrink-0 rounded-sm text-eyebrow font-bold uppercase text-on-track-accent underline-offset-4 hover:underline sm:block"
          >
            Full replay →
          </Link>
        </div>
      </div>

      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  );
}
