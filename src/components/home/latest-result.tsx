import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

/**
 * The race that just happened.
 *
 * Deliberately not a results table — the classification is on the race page and
 * repeating it here would be a worse copy. This is the podium and the fastest
 * lap, which is what the data actually supports.
 *
 * Two things it deliberately does not show. There is no winning margin: `gap`
 * is null on every position row from both upstreams, so any number would be
 * invented. And no "came from furthest back": `grid_position` is an Ergast
 * column, OpenF1 does not publish a starting grid, and every season from 2023
 * is OpenF1-only — so on a page about the current season that row would never
 * render at all.
 */

export type ResultRow = {
  finalPosition: number | null;
  fastestLap: boolean;
  driver: { code: string; name: string } | null;
  team: { name: string; color: string | null } | null;
};

export function LatestResult({
  slug,
  title,
  subtitle,
  isSprint,
  results,
}: {
  slug: string;
  title: string;
  subtitle: string;
  isSprint: boolean;
  results: ResultRow[];
}) {
  const podium = results
    .filter((row) => row.finalPosition !== null && row.finalPosition <= 3)
    .sort((a, b) => (a.finalPosition ?? 0) - (b.finalPosition ?? 0));

  const fastest = results.find((row) => row.fastestLap);

  if (podium.length === 0) return null;

  return (
    <section className="reveal mt-14">
      <h2 className="text-eyebrow font-bold uppercase text-muted">Last time out</h2>

      <Card className="mt-3 p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div>
            <Link href={`/races/${slug}`} className="rounded-sm">
              <h3 className="type-section-title hover:text-accent">{title}</h3>
            </Link>
            <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          </div>
          {isSprint ? <Badge>Sprint</Badge> : null}
        </div>

        <ol className="mt-6 grid gap-2 sm:grid-cols-3">
          {podium.map((row) => (
            <li
              key={row.driver?.code ?? row.finalPosition}
              className="flex items-center gap-3 rounded-lg border border-line bg-panel-strong/40 px-4 py-3"
            >
              <span className="tabular text-2xl font-bold text-subtle">{row.finalPosition}</span>
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: row.team?.color ?? 'var(--muted)' }}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{row.driver?.name ?? '—'}</span>
                <span className="block truncate text-xs text-muted">{row.team?.name ?? '—'}</span>
              </span>
            </li>
          ))}
        </ol>

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {fastest ? (
            <div className="flex gap-2">
              <dt className="text-muted">Fastest lap</dt>
              <dd className="font-semibold">{fastest.driver?.code}</dd>
            </div>
          ) : null}
        </dl>
      </Card>
    </section>
  );
}
