import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

type Db = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> };

/**
 * A token bucket in Postgres.
 *
 * Redis is the usual home for this and is not free, so the bucket lives in the
 * database we already pay nothing for. At this traffic one upsert per request
 * is cheaper than the query the request was going to run anyway.
 *
 * The whole decision is one statement, so two concurrent requests cannot both
 * read the same remaining token and both spend it. Refill is lazy — tokens are
 * computed from the time since the last spend rather than by a job — which
 * means an idle key costs nothing and there is no scheduler to keep alive.
 */

export type Bucket = {
  /** Burst size: how many requests can arrive at once from cold. */
  capacity: number;
  /** Sustained rate once the burst is spent. */
  refillPerSecond: number;
};

export async function consume(key: string, bucket: Bucket, db: Db = getDb()): Promise<boolean> {
  const { capacity, refillPerSecond } = bucket;

  // `where` on the conflict branch is what makes this a limiter rather than a
  // counter: when the refilled balance is under one token the update does not
  // happen, nothing is returned, and no token is spent. An update that clamped
  // at zero instead would keep pushing `updated_at` forward and starve the
  // refill for as long as a caller kept hammering it.
  const refilled = sql`least(
    ${capacity}::real,
    rate_limits.tokens + extract(epoch from (now() - rate_limits.updated_at))::real * ${refillPerSecond}::real
  )`;

  const result = await db.execute(sql`
    insert into rate_limits (key, tokens, updated_at)
    values (${key}, ${capacity - 1}::real, now())
    on conflict (key) do update
      set tokens = ${refilled} - 1, updated_at = now()
      where ${refilled} >= 1
    returning tokens
  `);

  return result.rows.length > 0;
}

/**
 * Who to charge, from a request's headers — a route handler passes
 * `request.headers`, a Server Action passes `await headers()`.
 *
 * Vercel sets `x-forwarded-for`; its first entry is the client
 * as the platform saw it, and the rest are proxies. A request without one is
 * charged to a single shared key rather than being let through — a caller who
 * can suppress the header would otherwise be the only one never limited.
 */
export function clientKey(headers: Headers, prefix: string): string {
  const forwarded = headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim();
  return `${prefix}:${ip || 'unknown'}`;
}
