'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

/**
 * How far into the season we are, and how long until the next race.
 *
 * A client component for one reason: time. The schedule is cached for a day
 * and the page is partially prerendered, so anything the server computed from
 * `Date.now()` would be baked into the shell and go stale — a countdown that
 * says "in 3 days" for a week. The browser holds the only clock that is right,
 * so it gets the whole schedule and decides for itself which race is next.
 *
 * That also means the first client render must agree with the server's HTML,
 * so the clock is read through `useSyncExternalStore`, whose server snapshot is
 * "no time yet". Hydration matches, and the value arrives on subscribe.
 */

// The clock, as an external store. A minute is the resolution the display
// shows; a per-second tick would re-render sixty times to change nothing. The
// snapshot has to be a cached value rather than a fresh `Date.now()`, because
// `useSyncExternalStore` compares snapshots and a value that changes on every
// read never settles.
let clock = 0;

function subscribeToClock(onChange: () => void) {
  clock = Date.now();
  onChange();
  const timer = setInterval(() => {
    clock = Date.now();
    onChange();
  }, 60_000);
  return () => clearInterval(timer);
}

export type ScheduledRace = {
  slug: string;
  date: string;
  name: string;
  round: number;
};

export function SeasonStatus({ season, races }: { season: number; races: ScheduledRace[] }) {
  // Zero on the server and on the first client render: the season is described
  // without a clock until there is one.
  const now = useSyncExternalStore(subscribeToClock, () => clock, () => 0);

  const total = races.length;
  if (total === 0) return null;

  const completed = now === 0 ? null : races.filter((race) => Date.parse(race.date) <= now).length;
  const next = now === 0 ? null : races.find((race) => Date.parse(race.date) > now) ?? null;

  return (
    <section className="mt-14">
      <h2 className="text-eyebrow font-bold uppercase text-muted">{season} season</h2>
      <Card className="mt-3 p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="font-heading text-2xl font-bold tracking-tight">
            {next ? (
              <>
                Round {next.round} · <span className="text-muted">{next.name}</span>
              </>
            ) : completed === null ? (
              // The server render and the first client render, before the clock
              // is read. Naming the season is true regardless of the date.
              <>{total} rounds</>
            ) : (
              <>Season complete</>
            )}
          </p>
          {next ? (
            <p className="tabular text-lg font-semibold text-accent">{untilLabel(next.date, now)}</p>
          ) : null}
        </div>

        <div className="mt-5">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-panel-strong"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed ?? undefined}
            aria-label={`${season} season progress`}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${((completed ?? 0) / total) * 100}%` }}
            />
          </div>
          <p className="mt-2.5 text-sm text-muted">
            {completed === null
              ? `${total} rounds`
              : `${completed} of ${total} rounds complete`}
          </p>
        </div>

        {next ? (
          <Link
            href={`/races/${next.slug}`}
            className="mt-5 inline-flex rounded-sm text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            Race page →
          </Link>
        ) : null}
      </Card>
    </section>
  );
}

/**
 * Whole units only, largest first: "in 6 days", "in 4 hours", "in 12 minutes".
 * A race is scheduled to the minute and nobody reads seconds off a landing
 * page, so the smallest unit is the minute and "starting now" covers the hour
 * either side of a green light rather than counting down to zero and stopping.
 */
export function untilLabel(date: string, now: number): string {
  const minutes = Math.floor((Date.parse(date) - now) / 60_000);
  if (minutes < 1) return 'Starting now';

  const days = Math.floor(minutes / 1440);
  if (days >= 1) return `in ${days} ${plural(days, 'day')}`;

  const hours = Math.floor(minutes / 60);
  if (hours >= 1) return `in ${hours} ${plural(hours, 'hour')}`;

  return `in ${minutes} ${plural(minutes, 'minute')}`;
}

const plural = (n: number, unit: string) => (n === 1 ? unit : `${unit}s`);
