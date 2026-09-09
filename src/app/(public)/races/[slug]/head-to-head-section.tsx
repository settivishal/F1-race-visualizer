import { AutoSubmit } from '@/components/ui/auto-submit';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { HeadToHead } from '@/components/analysis/head-to-head';
import { getHeadToHead, getRaceHeader } from '@/lib/queries';

/**
 * The picker and the comparison.
 *
 * A plain GET form, as everywhere else the site lets someone choose something:
 * the URL is the state, which keeps this a server component and makes a
 * particular comparison a link someone can send.
 *
 * It defaults to the top two finishers rather than nothing. A picker that opens
 * empty asks the reader to do work before showing them what the thing is, and
 * the podium fight is the comparison most people came for anyway.
 */
export async function HeadToHeadSection({
  slug,
  driverA,
  driverB,
}: {
  slug: string;
  driverA: string | null;
  driverB: string | null;
}) {
  // The driver list comes from the header, which the page has already fetched
  // and cached — asking the head-to-head query for it first would mean two
  // round trips to learn who is even in the race.
  const { race: header } = await getRaceHeader(slug);
  if (!header) return null;

  const classified = [...header.results]
    .filter((row) => row.finalPosition !== null && row.driver !== null)
    .sort((a, b) => (a.finalPosition ?? 0) - (b.finalPosition ?? 0));

  if (classified.length < 2) {
    return (
      <EmptyState
        title="Nothing to compare"
        description="This race has fewer than two classified finishers on record."
      />
    );
  }

  const codeA = driverA ?? classified[0].driver!.code;
  const codeB = driverB ?? classified[1].driver!.code;

  const { race } = await getHeadToHead(slug, codeA, codeB);
  const comparison = race?.analysis.headToHead ?? null;

  return (
    <div className="space-y-5">
      <form method="get" className="flex flex-wrap items-end gap-3">
        {/* The tab lives in the query string too, so choosing a driver must not
            navigate away from the Analysis view. */}
        <input type="hidden" name="view" value="analysis" />
        <AutoSubmit />
        <Picker label="Driver" name="a" value={codeA} drivers={classified} />
        <Picker label="Against" name="b" value={codeB} drivers={classified} />
        <Button type="submit" variant="secondary">
          Compare
        </Button>
      </form>

      {comparison ? (
        <HeadToHead data={comparison} />
      ) : (
        <EmptyState
          title="Pick two different drivers"
          description={
            codeA === codeB
              ? 'A driver is not much of a rival to themselves.'
              : 'At least one of them did not start this race.'
          }
        />
      )}
    </div>
  );
}

function Picker({
  label,
  name,
  value,
  drivers,
}: {
  label: string;
  name: string;
  value: string;
  drivers: { finalPosition: number | null; driver: { code: string; name: string } | null }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-eyebrow font-semibold uppercase text-muted">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 rounded-md border border-line bg-panel px-3 text-sm text-foreground hover:border-line-strong"
      >
        {drivers.map((row) => (
          <option key={row.driver!.code} value={row.driver!.code}>
            P{row.finalPosition} · {row.driver!.name}
          </option>
        ))}
      </select>
    </label>
  );
}
