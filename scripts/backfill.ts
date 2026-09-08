import 'dotenv/config';
import { fetchSessions } from '@/lib/ingest/openf1';
import { ingestRace } from '@/lib/ingest/run';
import { isScoredSession } from '@/lib/ingest/transform';

/**
 * Imports a whole season, or one session.
 *
 *   pnpm tsx scripts/backfill.ts 2025        every scored session of 2025
 *   pnpm tsx scripts/backfill.ts 9693        one session, by key
 *
 * This runs locally or from a GitHub Action, so it has no serverless timeout
 * and can pace ~200 requests through the client's throttle over several
 * minutes. The cron handler does one race per invocation for exactly the
 * opposite reason.
 *
 * Same run.ts, same transaction boundary, same idempotency: nothing about
 * correctness depends on which entry point invoked it.
 */
async function main() {
  const arg = Number(process.argv[2] ?? 2025);
  if (!Number.isFinite(arg)) {
    console.error('usage: tsx scripts/backfill.ts <year|sessionKey>');
    process.exit(1);
  }

  const sessionKeys = arg > 3000 ? [arg] : await scoredSessionsOf(arg);
  console.log(`${sessionKeys.length} session(s) to ingest\n`);

  let failed = 0;
  for (const [index, sessionKey] of sessionKeys.entries()) {
    const label = `[${index + 1}/${sessionKeys.length}] ${sessionKey}`;
    try {
      const result = await ingestRace(sessionKey);
      console.log(`${label} ${result.slug} — ${result.rowsWritten} rows`);
      for (const warning of result.warnings) console.log(`    warning: ${warning}`);
    } catch (error) {
      // One race failing must not end the season. Every attempt is already
      // recorded in ingest_runs, so a failure here is visible either way.
      failed++;
      console.error(`${label} FAILED — ${error}`);
    }
  }

  console.log(`\ndone: ${sessionKeys.length - failed} succeeded, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

/**
 * Every scored session of a season, run or not.
 *
 * A mid-season year is mostly races that have not happened yet, and importing
 * one writes a meeting, a race row with its date, and the entry list — but no
 * positions, since there are none. That is a *scheduled* race, and the site
 * wants it: it is what gives the season progress bar its denominator and the
 * countdown something to count down to.
 *
 * A race with a future date and no positions is how the UI tells the two
 * apart; nothing here needs a status column to say so.
 */
async function scoredSessionsOf(year: number) {
  const sessions = await fetchSessions(year);
  return sessions
    .filter(isScoredSession)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
    .map((s) => s.session_key);
}

main().then(() => process.exit(process.exitCode ?? 0), (err) => { console.error(err); process.exit(1); });
