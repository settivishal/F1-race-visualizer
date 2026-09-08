import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { appConfig, ingestRuns, meetings, races } from '@/db/schema';
import { checkHealth } from '@/lib/health';
import { clientKey, consume } from '@/lib/rate-limit';

/**
 * Is the ingest working?
 *
 * The whole observability design rested on a person noticing a stale row in
 * /admin/runs (docs/decisions.md, "Observability"), and nobody did: the cron
 * spent six months pointed at the wrong season, finding nothing, reporting
 * success. This endpoint is what a scheduled workflow can ask instead, and
 * `.github/workflows/health.yml` fails when the answer is no.
 *
 * Public and unauthenticated, deliberately. It exposes which season is
 * configured and which races are missing — operational facts about a site whose
 * whole content is public race data, and nothing about anyone. Requiring a
 * secret would mean the check could not run from anywhere, which is most of the
 * value of having it.
 *
 * No route config: handlers are not cached unless one opts in, and Cache
 * Components rejects `export const dynamic` outright. A cached health check
 * would be a health check of the cache.
 */

// Generous: this is one query and the caller is a workflow, but a public
// unauthenticated endpoint gets a bucket like every other one.
const HEALTH_BUCKET = { capacity: 30, refillPerSecond: 1 };

export async function GET(request: Request) {
  if (!(await consume(clientKey(request.headers, 'health'), HEALTH_BUCKET))) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const db = getDb();

  const [config] = await db
    .select({ activeSeason: appConfig.activeSeason })
    .from(appConfig)
    .where(eq(appConfig.id, 1))
    .limit(1);

  // No config row is the state of a fresh database, which the cron treats as
  // "not configured" and skips. Saying so is more useful than guessing a year.
  if (!config) {
    return Response.json(
      { ok: false, problems: ['no app_config row: the active season is not set'] },
      { status: 503 },
    );
  }

  const [season, lastRun] = await Promise.all([
    db
      .select({ slug: races.slug, date: races.date, status: races.status })
      .from(races)
      .innerJoin(meetings, eq(meetings.id, races.meetingId))
      .where(eq(meetings.seasonYear, config.activeSeason)),
    db
      .select({ status: ingestRuns.status, startedAt: ingestRuns.startedAt })
      .from(ingestRuns)
      .orderBy(desc(ingestRuns.startedAt))
      .limit(1),
  ]);

  const report = checkHealth({
    activeSeason: config.activeSeason,
    races: season,
    lastRun: lastRun[0] ?? null,
    now: new Date(),
  });

  // 503 rather than 200-with-a-flag: a monitor should not have to parse a body
  // to know something is wrong, and every uptime checker understands a status.
  return Response.json(report, { status: report.ok ? 200 : 503 });
}
