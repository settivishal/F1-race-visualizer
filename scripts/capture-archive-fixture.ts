import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchRaceLaps, fetchRacePitStops, fetchSeasonResults } from '@/lib/ingest/ergast';

/**
 * Saves one archive race's raw Ergast payloads as a fixture.
 *
 * The sibling of `capture-fixture.ts`, for the other upstream. Same rule: when
 * a backfill trips over a race, capture it here and the failure becomes a
 * permanent regression test.
 *
 *   pnpm tsx scripts/capture-archive-fixture.ts <season> <round> <name>
 */
async function main() {
  const [season, round, name] = process.argv.slice(2);
  if (!season || !round || !name) {
    console.error('usage: tsx scripts/capture-archive-fixture.ts <season> <round> <name>');
    process.exit(1);
  }

  const year = Number(season);
  const roundNumber = Number(round);
  const dir = join('src/lib/ingest/__fixtures__', name);
  await mkdir(dir, { recursive: true });

  const races = await fetchSeasonResults(year);
  const race = races.find((r) => r.round === roundNumber);
  if (!race) throw new Error(`${year} has no round ${roundNumber}`);

  const parts = {
    race,
    laps: await fetchRaceLaps(year, roundNumber),
    pitStops: await fetchRacePitStops(year, roundNumber),
  };

  for (const [part, rows] of Object.entries(parts)) {
    await writeFile(join(dir, `${part}.json`), JSON.stringify(rows, null, 0) + '\n');
    console.log(`${name}/${part}.json  ${Array.isArray(rows) ? rows.length : 1} record(s)`);
  }
}

main().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
