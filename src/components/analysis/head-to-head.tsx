import { linePath, linearScale, formatLapTime } from '@/lib/scale';

/**
 * Two drivers, one race, lap by lap.
 *
 * `Race.analysis.headToHead` has existed since M5 — laps ahead each way, a
 * per-lap position and time delta, both sides' pace — and nothing had ever
 * queried it. This is the view it was written for.
 *
 * The chart is the position delta around a centre line: above it one driver is
 * ahead, below it the other. That single line answers the question people
 * actually argue about, which a table of two columns does not.
 */

const WIDTH = 720;
const HEIGHT = 160;
const PADDING = { left: 8, right: 8, top: 14, bottom: 22 };

export type Side = {
  driver: { code: string; name: string } | null;
  team: { name: string; color: string | null } | null;
  finalPosition: number | null;
  pace: { best: number | null; median: number | null; consistency: number | null; lapsCounted: number };
};

export type HeadToHeadData = {
  lapsAheadA: number;
  lapsAheadB: number;
  a: Side;
  b: Side;
  laps: { lap: number; positionDelta: number | null; timeDelta: number | null }[];
};

export function HeadToHead({ data }: { data: HeadToHeadData }) {
  const { a, b, laps, lapsAheadA, lapsAheadB } = data;

  const withDelta = laps.filter((lap) => lap.positionDelta !== null);
  const deltas = withDelta.map((lap) => lap.positionDelta as number);
  // Symmetric around zero, so "ahead" and "behind" are the same distance from
  // the centre line and neither driver's half looks bigger than the other's.
  const reach = Math.max(1, ...deltas.map(Math.abs));
  const lapNumbers = laps.map((lap) => lap.lap);
  const firstLap = lapNumbers[0] ?? 1;
  const lastLap = lapNumbers[lapNumbers.length - 1] ?? firstLap;

  const x = linearScale([firstLap, Math.max(firstLap + 1, lastLap)], [PADDING.left, WIDTH - PADDING.right]);
  // Inverted: a negative delta means A is in front, and in front belongs above.
  const y = linearScale([-reach, reach], [HEIGHT - PADDING.bottom, PADDING.top]);
  const centre = y(0);

  const colourA = a.team?.color ?? 'var(--muted)';
  const colourB = b.team?.color ?? 'var(--muted)';
  const total = lapsAheadA + lapsAheadB;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Contender side={a} colour={colourA} />
        <Contender side={b} colour={colourB} align="right" />
      </div>

      {total > 0 ? (
        <div>
          <div className="flex h-2 overflow-hidden rounded-full bg-panel-strong" role="img"
            aria-label={`${a.driver?.code ?? 'A'} ahead on ${lapsAheadA} laps, ${b.driver?.code ?? 'B'} on ${lapsAheadB}`}>
            <div style={{ width: `${(lapsAheadA / total) * 100}%`, backgroundColor: colourA }} />
            <div style={{ width: `${(lapsAheadB / total) * 100}%`, backgroundColor: colourB }} />
          </div>
          <p className="tabular mt-2 flex justify-between text-sm text-muted">
            <span>
              <span className="font-semibold text-foreground">{lapsAheadA}</span> laps ahead
            </span>
            <span>
              <span className="font-semibold text-foreground">{lapsAheadB}</span> laps ahead
            </span>
          </p>
        </div>
      ) : null}

      {withDelta.length > 1 ? (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full min-w-[32rem]"
            role="img"
            aria-label={`Position gap between ${a.driver?.code ?? 'A'} and ${b.driver?.code ?? 'B'}, lap by lap`}
          >
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={centre}
              y2={centre}
              className="stroke-line-strong"
              strokeWidth={1}
            />

            {/* Filled to the centre line rather than drawn as a bare line: the
                side of the axis is the whole message, and a fill says it
                without the reader having to track which way is up. */}
            <path
              d={`${linePath(withDelta.map((lap) => ({ x: x(lap.lap), y: y(lap.positionDelta as number) })))} L ${x(withDelta[withDelta.length - 1].lap)} ${centre} L ${x(withDelta[0].lap)} ${centre} Z`}
              fill={colourA}
              fillOpacity={0.14}
            />
            <path
              d={linePath(withDelta.map((lap) => ({ x: x(lap.lap), y: y(lap.positionDelta as number) })))}
              fill="none"
              stroke={colourA}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            <text x={PADDING.left} y={PADDING.top} className="fill-muted text-[10px] font-semibold">
              {a.driver?.code} ahead
            </text>
            <text
              x={PADDING.left}
              y={HEIGHT - 6}
              className="fill-muted text-[10px] font-semibold"
            >
              {b.driver?.code} ahead
            </text>
          </svg>
        </div>
      ) : (
        <p className="text-sm text-muted">
          They were never on track together for long enough to compare lap by lap.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <PaceRow label="Median lap" a={a.pace.median} b={b.pace.median} format={formatLapTime} />
        <PaceRow label="Best lap" a={a.pace.best} b={b.pace.best} format={formatLapTime} />
        <PaceRow
          label="Consistency"
          a={a.pace.consistency}
          b={b.pace.consistency}
          format={(value) => `±${value.toFixed(2)}s`}
        />
        <PaceRow
          label="Laps counted"
          a={a.pace.lapsCounted}
          b={b.pace.lapsCounted}
          format={String}
        />
      </dl>
    </div>
  );
}

function Contender({
  side,
  colour,
  align = 'left',
}: {
  side: Side;
  colour: string;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-line bg-panel-strong/40 px-4 py-3 ${
        align === 'right' ? 'sm:flex-row-reverse sm:text-right' : ''
      }`}
    >
      <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colour }} aria-hidden />
      <div className="min-w-0">
        <p className="truncate font-semibold">{side.driver?.name ?? '—'}</p>
        <p className="truncate text-xs text-muted">
          {side.team?.name ?? '—'}
          {side.finalPosition !== null ? ` · finished P${side.finalPosition}` : ' · did not finish'}
        </p>
      </div>
    </div>
  );
}

/** Both values on one row, with the better of the two carrying the weight. */
function PaceRow({
  label,
  a,
  b,
  format,
}: {
  label: string;
  a: number | null;
  b: number | null;
  format: (value: number) => string;
}) {
  // Lower is better for every measure here — a time, a spread, and for laps
  // counted the two are simply reported rather than ranked.
  const ranked = label !== 'Laps counted';
  const aWins = ranked && a !== null && (b === null || a < b);
  const bWins = ranked && b !== null && (a === null || b < a);

  return (
    <div>
      <dt className="text-eyebrow font-semibold uppercase text-muted">{label}</dt>
      <dd className="tabular mt-1 flex justify-between gap-3">
        <span className={aWins ? 'font-bold' : 'text-muted'}>{a === null ? '—' : format(a)}</span>
        <span className={bWins ? 'font-bold' : 'text-muted'}>{b === null ? '—' : format(b)}</span>
      </dd>
    </div>
  );
}
