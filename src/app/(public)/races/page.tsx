import { Suspense } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getRaceLibrary } from '@/lib/queries';

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
  const season = Number.isInteger(parsedSeason) ? parsedSeason : null;

  const search = first(params.q)?.trim() || null;
  const after = first(params.after) ?? null;

  const { races, seasons } = await getRaceLibrary(season, search, after);

  const fieldClasses =
    'h-10 w-full rounded-md border border-line bg-panel px-3 text-sm text-foreground transition-[border-color] hover:border-line-strong';

  return (
    <>
      <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-eyebrow font-semibold uppercase text-muted">Season</span>
          <select name="season" defaultValue={season ?? ''} className={fieldClasses}>
            <option value="">All seasons</option>
            {seasons.map((entry) => (
              <option key={entry.year} value={entry.year}>
                {entry.year}
              </option>
            ))}
          </select>
        </label>

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
          Filter
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
                  </div>
                  <h2 className="font-heading mt-2.5 text-xl font-bold tracking-tight">
                    {node.meeting?.name ?? node.slug}
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">
                    {node.meeting?.circuitName ?? node.meeting?.country ?? '—'} ·{' '}
                    <span className="tabular">{node.laps}</span> laps
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {races.pageInfo.hasNextPage && races.pageInfo.endCursor ? (
        <div className="mt-8 flex justify-center">
          <Link
            href={{
              pathname: '/races',
              query: {
                ...(season ? { season: String(season) } : {}),
                ...(search ? { q: search } : {}),
                after: races.pageInfo.endCursor,
              },
            }}
            className="rounded-md"
          >
            <Button variant="secondary">Next page</Button>
          </Link>
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
