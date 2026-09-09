/**
 * The one check that runs before anything is served.
 *
 * Every environment variable this app needs used to fail late and quietly:
 * `DATABASE_URL` throws on the first query (`db/index.ts`), `CRON_SECRET`
 * silently denies every cron call when unset (`api/cron/ingest/route.ts`),
 * `AUTH_SECRET` is read by NextAuth and named nowhere in `src/`, and
 * `SITE_URL`/`VERCEL_PROJECT_PRODUCTION_URL` fall back to `http://localhost:3000` —
 * which a production deploy would then publish as its canonical URL, in its
 * sitemap, and in every OG tag, with nothing anywhere reporting a problem.
 *
 * So: assert them once, at module scope, and only on production. Preview
 * deployments and local development keep the fallbacks, because a preview with
 * no `CRON_SECRET` is a preview and not a fault.
 *
 * No zod. It is a dependency here already, but it parses upstream API payloads
 * of unknown shape (`lib/ingest/ergast.ts`); five presence checks are five
 * presence checks.
 */
const REQUIRED = ['DATABASE_URL', 'AUTH_SECRET', 'CRON_SECRET'];

export function requireEnv(): void {
  if (process.env.VERCEL_ENV !== 'production') return;

  const missing: string[] = REQUIRED.filter((name) => !process.env[name]);

  // Either one names the site; `site-url.ts` prefers SITE_URL and falls back to
  // the Vercel-provided production domain.
  if (!process.env.SITE_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    missing.push('SITE_URL (or VERCEL_PROJECT_PRODUCTION_URL)');
  }

  // All of them at once. Fixing these one deploy at a time is the slow way to
  // find out there were four.
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''} in production: ${missing.join(', ')}`,
    );
  }
}
