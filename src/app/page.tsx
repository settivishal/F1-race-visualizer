import { Suspense } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageContainer } from '@/components/ui/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { getDriverStandings, getFeaturedRace } from '@/lib/queries';

// Reads through the schema, not around it. A server component could query
// Drizzle directly and be quicker to write, but then GraphQL would be a facade
// over one path rather than the data layer — and the resolvers, the loaders and
// the query budget would go unexercised by the page people actually load.

const SEASON = 2025;

export default function Home() {
  return (
    <PageContainer className="py-14">
      <section className="max-w-3xl">
        <p className="text-eyebrow font-bold uppercase text-accent">
          {SEASON} season
        </p>
        <h1 className="font-heading mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Every position change,
          <br />
          <span className="text-muted">lap by lap.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          A grand prix is a thousand small moves that only make sense together. Pick a race
          and watch the order rearrange itself — pit windows, safety cars, the lap someone
          finally got past.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/races">
            <Button size="lg">Browse races</Button>
          </Link>
        </div>
      </section>

      {/* Each section streams on its own, so a slow standings query cannot hold
          up the featured race or the hero above it. */}
      <Suspense fallback={<FeaturedSkeleton />}>
        <FeaturedRace />
      </Suspense>

      <Suspense fallback={<StandingsSkeleton />}>
        <Standings />
      </Suspense>
    </PageContainer>
  );
}

async function FeaturedRace() {
  const race = await getFeaturedRace();
  if (!race) return null;

  return (
    <section className="mt-14">
      <h2 className="text-eyebrow font-bold uppercase text-muted">Start here</h2>
      <Link
        href={`/races/${race.slug}`}
        className="mt-3 block rounded-xl"
        prefetch
      >
        <Card interactive className="p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              {race.meeting ? `Round ${race.meeting.round}` : 'Race'}
            </Badge>
            {race.type === 'SPRINT' ? <Badge>Sprint</Badge> : null}
          </div>
          <p className="font-heading mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {race.meeting?.name ?? race.slug}
          </p>
          <p className="mt-2 text-muted">
            {race.meeting?.circuitName ?? race.meeting?.country ?? '—'} ·{' '}
            <span className="tabular">{race.laps}</span> laps
          </p>
        </Card>
      </Link>
    </section>
  );
}

async function Standings() {
  const { driverStandings } = await getDriverStandings(SEASON);

  if (driverStandings.length === 0) {
    return null;
  }

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Drivers&rsquo; championship
        </h2>
        <p className="text-sm text-muted">Derived from results, not stored</p>
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">
            {SEASON} drivers&rsquo; championship standings
          </caption>
          <thead>
            <tr className="border-b border-line text-eyebrow uppercase text-muted">
              <th scope="col" className="py-3 pl-5 pr-3 font-semibold">Pos</th>
              <th scope="col" className="py-3 pr-3 font-semibold">Driver</th>
              <th scope="col" className="py-3 pr-3 font-semibold">Team</th>
              <th scope="col" className="py-3 pr-5 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {driverStandings.map((standing) => (
              <tr
                key={standing.driver.code}
                className="border-b border-line/60 last:border-0"
              >
                <td className="tabular py-2.5 pl-5 pr-3 text-muted">{standing.position}</td>
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="h-4 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: standing.team.color ?? 'var(--muted)' }}
                    />
                    <span className="font-mono text-xs font-medium text-muted">
                      {standing.driver.code}
                    </span>
                    <span className="font-medium">{standing.driver.name}</span>
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-muted">{standing.team.name}</td>
                <td className="tabular py-2.5 pr-5 text-right font-semibold">
                  {standing.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

/*
 * The fallbacks are sized to their content rather than to a spinner, so the
 * page does not resize when either section arrives.
 */
function FeaturedSkeleton() {
  return (
    <section className="mt-14">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-[11.5rem] w-full rounded-xl" />
    </section>
  );
}

function StandingsSkeleton() {
  return (
    <section className="mt-14">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-4 h-[28rem] w-full rounded-xl" />
    </section>
  );
}
