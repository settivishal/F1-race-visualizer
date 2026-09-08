import { Suspense, ViewTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { RaceStartTime } from '@/components/schedule/upcoming-race';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveSeason, getRaceLibrary } from '@/lib/queries';

export const metadata = {
  title: 'Races — F1 Race Visualizer',
  description: 'Every grand prix and sprint in the archive, by season.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * The race library.
 *
 * v1 did this as a client component that fetched every race on mount and
 * filtered in the browser. Here the filtering is `Query.races(season:,
 * search:)`, and the controls are a plain GET form — so the result set lives
 * in the URL rather than in component state. That makes a filtered view
 * shareable and reloadable, works before any JavaScript arrives, and lets the
 * cache hold the answer, which client-side filtering cannot.
 *
 * The page itself is deliberately not async. `searchParams` is runtime data,
 * and reading it in the page body would stop the whole route prerendering —
 * so the heading ships in the static shell and only the part that genuinely
 * depends on the query string streams in behind a Suspense boundary.
 */
export default function RacesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Archive"
        title="Races"
        description="Pick a race to replay it lap by lap."
      />
      <Suspense fallback={<LibrarySkeleton />}>
        <RaceLibrary searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

/**
 * Everything below the heading. `searchParams` is read here and the values are
 * passed to `getRaceLibrary` as arguments, because a `use cache` scope cannot
 * touch runtime APIs — and those same arguments are what key the cache entry.
 */
async function RaceLibrary({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const seasonParam = first(params.season);
  const parsedSeason = seasonParam ? Number(seasonParam) : NaN;
  // `?season=all` is explicit, because the default is no longer "everything":
  // landing on the current season is what almost everyone wants, and it fits a
  // single page, which is what makes the pagination controls disappear.
  const season = seasonParam === 'all'
    ? null
    : Number.isInteger(parsedSeason)
      ? parsedSeason
      : await getActiveSeason();

  const search = first(params.q)?.trim() || null;
  const after = first(params.after) ?? null;
  const before = first(params.before) ?? null;

  const { races, seasons } = await getRaceLibrary(season, search, after, before);

  // Carried on every link so a filter survives paging and vice versa.
  const context = {
    ...(season === null ? { season: 'all' } : { season: String(season) }),
    ...(search ? { q: search } : {}),
  };

  const fieldClasses =
    'h-10 w-full rounded-md border border-line bg-panel px-3 text-sm text-foreground transition-[border-color] hover:border-line-strong';

  return (
    <>
      {/* Links, not a select with a Filter button. A year is a destination,
          and a destination is an href — it filters on click, needs no
          JavaScript, and each season is a URL someone can send. */}
      <nav aria-label="Season" className="mt-8 flex flex-wrap gap-1.5">
        {[...seasons].reverse().map((entry) => {
          const isActive = season === entry.year;
          return (
            <Link
              key={entry.year}
              href={{ pathname: '/races', query: { season: String(entry.year), ...(search ? { q: search } : {}) } }}
              aria-current={isActive ? 'page' : undefined}
              className={`tabular rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-accent text-on-accent'
                  : 'border border-line text-muted hover:border-line-strong hover:text-foreground'
              }`}
            >
              {entry.year}
            </Link>
          );
        })}
        <Link
          href={{ pathname: '/races', query: { season: 'all', ...(search ? { q: search } : {}) } }}
          aria-current={season === null ? 'page' : undefined}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            season === null
              ? 'bg-accent text-on-accent'
              : 'border border-line text-muted hover:border-line-strong hover:text-foreground'
          }`}
        >
          All seasons
        </Link>
      </nav>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {/* The season rides along as a hidden field, so searching does not
            silently throw away the year the reader chose. */}
        <input type="hidden" name="season" value={season === null ? 'all' : String(season)} />

        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="text-eyebrow font-semibold uppercase text-muted">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder="Monaco, Silverstone, sprint…"
            className={fieldClasses}
          />
        </label>

        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {races.edges.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No races match"
            description="Try a different season, or clear the search."
            action={
              <Link href="/races">
                <Button variant="secondary" size="sm">
                  Clear filters
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {races.edges.map(({ node }) => (
            <li key={node.id}>
              {/* prefetch: the race pages are prerendered and cached, so warming
                  one on hover costs almost nothing and removes the wait on the
                  click that matters. */}
              <Link href={`/races/${node.slug}`} className="block h-full rounded-xl" prefetch>
                <Card interactive className="flex h-full flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-eyebrow font-semibold uppercase text-muted">
                      {node.meeting
                        ? `${node.meeting.season} · Round ${node.meeting.round}`
                        : 'Season unknown'}
                    </span>
                    {node.type === 'SPRINT' ? <Badge>Sprint</Badge> : null}
                    {/* No laps means no result: the calendar is stored whole, so
                        a race the season has not reached yet is a real row. */}
                    {node.laps === 0 ? <Badge tone="accent">Upcoming</Badge> : null}
                  </div>
                  {/* The same name on the race page's <h1>, so the title is
                      one object that moves rather than two that swap. */}
                  <ViewTransition name={`race-title-${node.slug}`} share="race-morph" default="none">
                    <h2 className="type-card-title mt-2.5">
                      {node.meeting?.name ?? node.slug}
                    </h2>
                  </ViewTransition>
                  <p className="mt-1.5 text-sm text-muted">
                    {node.meeting?.circuitName ?? node.meeting?.country ?? '—'} ·{' '}
                    {node.laps === 0 ? (
                      <RaceStartTime date={node.date} />
                    ) : (
                      <>
                        <span className="tabular">{node.laps}</span> laps
                      </>
                    )}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {races.pageInfo.hasPreviousPage || races.pageInfo.hasNextPage ? (
        <div className="mt-8 flex justify-center gap-3">
          {races.pageInfo.hasPreviousPage && races.pageInfo.startCursor ? (
            <Link
              href={{ pathname: '/races', query: { ...context, before: races.pageInfo.startCursor } }}
              className="rounded-md"
            >
              <Button variant="secondary">← Previous</Button>
            </Link>
          ) : null}
          {races.pageInfo.hasNextPage && races.pageInfo.endCursor ? (
            <Link
              href={{ pathname: '/races', query: { ...context, after: races.pageInfo.endCursor } }}
              className="rounded-md"
            >
              <Button variant="secondary">Next →</Button>
            </Link>
          ) : null}
        </div>
      ) : null}

    </>
  );
}

/** Sized to a filled grid, so the page does not grow as the races arrive. */
function LibrarySkeleton() {
  return (
    <div className="mt-8">
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[8.5rem] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
