import Link from 'next/link';

/**
 * The season as a row of dots, one per round, in the winning team's colour.
 *
 * A standings table says who is ahead; this says how the season went — three
 * silver rounds then five red ones is a story you can read without knowing a
 * single number. Rounds not yet run are hollow, so the strip also shows how much
 * season is left.
 *
 * Grands prix only: a sprint is a session inside a round, and counting it would
 * make a twenty-four race season render thirty-one dots.
 */

export type PulseRound = {
  round: number;
  name: string;
  slug: string | null;
  winnerCode: string | null;
  teamColor: string | null;
};

export function SeasonPulse({ season, rounds }: { season: number; rounds: PulseRound[] }) {
  if (rounds.length === 0) return null;

  const run = rounds.filter((round) => round.winnerCode !== null).length;

  return (
    <section className="reveal mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-eyebrow font-bold uppercase text-muted">{season} at a glance</h2>
        <p className="tabular text-eyebrow font-semibold uppercase text-subtle">
          {run} of {rounds.length} run
        </p>
      </div>

      <ol className="mt-4 flex flex-wrap gap-1.5">
        {rounds.map((round) => {
          const label = round.winnerCode
            ? `Round ${round.round}, ${round.name}: won by ${round.winnerCode}`
            : `Round ${round.round}, ${round.name}: not yet run`;

          const dot = (
            <span
              className={`block h-9 w-9 rounded-lg border transition-transform ${
                round.winnerCode
                  ? 'border-transparent group-hover:scale-110'
                  : 'border-dashed border-line'
              }`}
              style={
                round.winnerCode
                  ? { backgroundColor: round.teamColor ?? 'var(--muted)' }
                  : undefined
              }
              aria-hidden
            />
          );

          return (
            <li key={round.round}>
              {round.slug ? (
                <Link href={`/races/${round.slug}`} className="group block rounded-lg" title={label}>
                  <span className="sr-only">{label}</span>
                  {dot}
                </Link>
              ) : (
                <span className="block" title={label}>
                  <span className="sr-only">{label}</span>
                  {dot}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
