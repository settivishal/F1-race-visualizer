'use client';

import { useState } from 'react';
import Link from 'next/link';
import { linePath, linearScale } from '@/lib/scale';

/**
 * The last race, as a chart you can drag.
 *
 * The hero used to promise "watch the order rearrange itself" above a page
 * where nothing moved. This is the promise, in miniature: drag the scrubber and
 * the lines draw lap by lap.
 *
 * Deliberately not the real replay. That is a timing tower, a play loop, event
 * markers and framer-motion — a bundle nobody asked for on a landing page. This
 * is polylines and a range input. Anyone who wants the real thing follows the
 * link, which carries the lap they left off at through `?lap=`.
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
}: {
  slug: string;
  title: string;
  drivers: HeroDriver[];
  maxLap: number;
  maxPosition: number;
}) {
  // Opens at the end, showing the finished race. Starting at lap one would open
  // on a vertical line of grid slots, which says nothing about anything.
  const [lap, setLap] = useState(maxLap);

  const x = linearScale([1, Math.max(2, maxLap)], [PADDING.left, WIDTH - PADDING.right]);
  // Inverted: P1 belongs at the top, and SVG's y grows downward.
  const y = linearScale([1, Math.max(2, maxPosition)], [PADDING.top, HEIGHT - PADDING.bottom]);

  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-xl border border-line-strong bg-track p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Position changes through lap ${lap} of the ${title}`}
        >
          {drivers.map((driver) => {
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

        <div className="mt-3 flex items-center gap-3">
          <label className="flex-1">
            <span className="sr-only">Lap</span>
            <input
              type="range"
              min={1}
              max={Math.max(1, maxLap)}
              value={lap}
              onChange={(event) => setLap(Number(event.target.value))}
              className="w-full accent-accent"
            />
          </label>
          <span className="tabular shrink-0 text-eyebrow font-bold uppercase text-white/70">
            Lap {lap}/{maxLap}
          </span>
        </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted">{title}</span>
        <Link
          href={`/races/${slug}?lap=${lap}`}
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Open the full replay →
        </Link>
      </figcaption>
    </figure>
  );
}
