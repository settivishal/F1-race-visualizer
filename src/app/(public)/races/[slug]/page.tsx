import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/ui/page-container';
import { CircuitInfoPanel } from '@/components/replay/circuit-info-panel';
import { RaceVisualizationPlayer } from '@/components/replay/race-visualization-player';
import { toReplayView } from '@/components/replay/types';
import { getRaceHeader, getRaceReplay, getRaceSlugs } from '@/lib/queries';

/**
 * The race detail page.
 *
 * The replay is its own cached query and its own Suspense boundary. It is the
 * one payload in the application large enough to matter — every lap of every
 * driver — so the header and the classification render without waiting on it.
 */
export async function generateStaticParams() {
  const { races } = await getRaceSlugs();
  return races.edges.map(({ node }) => ({ slug: node.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { race } = await getRaceHeader(slug);

  if (!race) return { title: 'Race not found — F1 Race Visualizer' };

  const name = race.meeting?.name ?? race.slug;
  return {
    title: `${name} — F1 Race Visualizer`,
    description: `Lap-by-lap replay of the ${race.meeting?.season ?? ''} ${name}.`.trim(),
  };
}

const STATUS_LABEL: Record<string, string> = {
  FINISHED: '',
  DNF: 'DNF',
  DNS: 'DNS',
  DSQ: 'DSQ',
};

/**
 * `params` is URL data, and reading it above every Suspense boundary makes the
 * whole route block on the navigation instead of streaming into a shell. So the
 * page itself is not async: the container and the back link are the shell, and
 * everything keyed by the slug renders below the boundary.
 */
export default function RacePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageContainer>
      <Link
        href="/races"
        className="inline-flex rounded-sm text-eyebrow font-semibold uppercase text-muted transition-colors hover:text-foreground"
      >
        ← All races
      </Link>

      <Suspense fallback={<RaceSkeleton />}>
        <RaceDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function RaceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { race } = await getRaceHeader(slug);

  if (!race) notFound();

  const meeting = race.meeting;
  const classified = [...race.results].sort((a, b) => {
    // A DNF has no finishing position, so it sorts after everyone who has one
    // rather than to the front on a null.
    if (a.finalPosition === null) return b.finalPosition === null ? 0 : 1;
    if (b.finalPosition === null) return -1;
    return a.finalPosition - b.finalPosition;
  });

  return (
    <>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow font-semibold uppercase text-accent">
            {meeting ? `${meeting.season} · Round ${meeting.round}` : 'Season unknown'}
          </p>
          <h1 className="font-heading mt-2.5 text-4xl font-bold tracking-tight sm:text-5xl">
            {meeting?.name ?? race.slug}
          </h1>
          <p className="mt-2.5 text-muted">
            {meeting?.circuitName ?? meeting?.country ?? '—'} ·{' '}
            <span className="tabular">{race.laps}</span> laps
          </p>
        </div>
        {race.type === 'SPRINT' ? <Badge>Sprint</Badge> : null}
      </header>

      <div className="mt-10">
        <Suspense fallback={<ReplaySkeleton />}>
          <Replay slug={slug} />
        </Suspense>
      </div>

      <div className="mt-10">
        <CircuitInfoPanel
          circuitName={meeting?.circuitName ?? null}
          country={meeting?.country ?? null}
          raceName={meeting?.name ?? null}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Classification</h2>
        <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">
            Final classification for the {meeting?.name ?? race.slug}
          </caption>
          <thead>
            <tr className="border-b border-line text-eyebrow uppercase text-muted">
              <th scope="col" className="py-3 pl-5 pr-3 font-semibold">Pos</th>
              <th scope="col" className="py-3 pr-3 font-semibold">Driver</th>
              <th scope="col" className="py-3 pr-3 font-semibold">Team</th>
              <th scope="col" className="py-3 pr-3 text-right font-semibold">Laps</th>
              <th scope="col" className="py-3 pr-5 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {classified.map((result, index) => (
              <tr
                key={result.driver?.code ?? `row-${index}`}
                className="border-b border-line/60 last:border-0"
              >
                <td className="tabular py-2.5 pl-5 pr-3 text-muted">
                  {result.finalPosition ?? STATUS_LABEL[result.status] ?? '—'}
                </td>
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2.5">
                    <span
                      className="h-4 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: result.team?.color ?? 'var(--muted)' }}
                      aria-hidden
                    />
                    <span className="font-mono text-xs font-medium text-muted">
                      {result.driver?.code ?? '—'}
                    </span>
                    <span className="font-medium">{result.driver?.name ?? 'Unknown driver'}</span>
                    {result.fastestLap ? (
                      <span
                        className="text-eyebrow font-bold uppercase text-accent"
                        title="Fastest lap"
                      >
                        FL
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-muted">{result.team?.name ?? '—'}</td>
                <td className="tabular py-2.5 pr-3 text-right">{result.lapsCompleted}</td>
                <td className="tabular py-2.5 pr-5 text-right font-semibold">{result.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </Card>
      </section>
    </>
  );
}

/**
 * toReplayView narrows the payload once here: it drops entries whose driver row
 * is missing, and fills a team colour where there is none. Both are conditions
 * the schema is honest about and the renderer has nothing to draw for.
 */
async function Replay({ slug }: { slug: string }) {
  const { race } = await getRaceReplay(slug);
  if (!race) return null;

  return <RaceVisualizationPlayer visualization={toReplayView(race)} />;
}

/** The shell's fallback: header, player and classification, in that order. */
function RaceSkeleton() {
  return (
    <div className="mt-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-12 w-96 max-w-full" />
      <Skeleton className="mt-3 h-5 w-64" />
      <div className="mt-10 space-y-4">
        <Skeleton className="h-[26rem] w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="mt-10 h-[30rem] w-full rounded-xl" />
    </div>
  );
}

/**
 * Sized to the player rather than to a spinner. The replay is the tallest thing
 * on the page, so a short fallback makes everything below it jump when the
 * payload lands.
 */
function ReplaySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[26rem] w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <p className="sr-only" role="status">
        Loading replay
      </p>
    </div>
  );
}
