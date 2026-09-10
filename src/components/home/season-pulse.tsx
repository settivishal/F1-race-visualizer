import Link from 'next/link';
import { inkOn, teamMonogram } from '@/lib/team-monogram';

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
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  winnerCode: string | null;
  teamName: string | null;
  teamColor: string | null;
};

export function SeasonPulse({ season, rounds }: { season: number; rounds: PulseRound[] }) {
  if (rounds.length === 0) return null;

  const run = rounds.filter((round) => round.status === 'COMPLETED').length;
  // A cancelled round is not one still to come, so it is not counted in the
  // denominator either — "13 of 23" is the honest 2026 season.
  const scheduled = rounds.filter((round) => round.status !== 'CANCELLED').length;

  return (
    <section className="reveal mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-eyebrow font-bold uppercase text-muted">{season} at a glance</h2>
        <p className="tabular text-eyebrow font-semibold uppercase text-subtle">
          {run} of {scheduled} run
        </p>
      </div>

      {/* The curve is decoration and says nothing a reader needs, so it is
          hidden and drawn behind the pills rather than between them. It only
          exists at the width where the row does not wrap — a wave that wraps
          is not a wave. */}
      <div className="relative mt-4">
        <svg
          aria-hidden
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-14 -translate-y-1/2 sm:block"
        >
          <path
            d="M0,7 C8,1 16,1 25,5 C34,9 42,9 50,4 C58,0 66,0 75,6 C83,10 91,10 100,5"
            fill="none"
            stroke="var(--line-strong)"
            strokeWidth={0.4}
            strokeDasharray="1.5,1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <ol className="relative flex flex-wrap gap-1.5 sm:flex-nowrap sm:justify-between">
        {rounds.map((round) => {
          const label =
            round.status === 'CANCELLED'
              ? `Round ${round.round}, ${round.name}: cancelled`
              : round.winnerCode
                ? `Round ${round.round}, ${round.name}: won by ${round.winnerCode}`
                : `Round ${round.round}, ${round.name}: not yet run`;

          const monogram = round.winnerCode ? teamMonogram(round.teamName) : null;

          const dot = (
            <span
              className={`relative block h-9 w-9 rounded-lg border transition-transform ${
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
            >
              {/* Who won it, on their own colour. The colour still does the
                  distance work — a season reads as a run of reds or silvers
                  from across the room — and the monogram answers the question
                  the colour cannot: which red. */}
              {monogram ? (
                <span
                  className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold tracking-tight"
                  style={{ color: inkOn(round.teamColor) }}
                >
                  {monogram}
                </span>
              ) : null}
              {/* A cancelled round keeps its place, struck through: the season
                  did schedule it, and a calendar that hides it never existed. */}
              {round.status === 'CANCELLED' ? (
                <span className="absolute left-1 right-1 top-1/2 h-px -translate-y-1/2 rotate-45 bg-flag-red" />
              ) : null}
            </span>
          );

          return (
            // The wave. A sine of the round's place in the season, matching the
            // guide line behind it, and only above `sm` where the row is one
            // line — the wrapped layout below that keeps its flat grid.
            <li
              key={round.round}
              className="sm:[transform:translateY(var(--wave))]"
              style={
                {
                  '--wave': `${Math.sin((round.round / Math.max(rounds.length, 1)) * Math.PI * 3.6) * -10}px`,
                } as React.CSSProperties
              }
            >
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
      </div>
    </section>
  );
}
