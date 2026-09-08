import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as dbSchema from '@/db/schema';
import { clientKey, consume } from './rate-limit';

let db: ReturnType<typeof drizzle<typeof dbSchema>>;

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema: dbSchema });
  await migrate(db, { migrationsFolder: './src/db/migrations' });
});

// The real thing runs against Postgres, so the test does too — the refill is
// SQL arithmetic over now(), and a mock of the database would only prove the
// mock agrees with itself.
const bucket = { capacity: 3, refillPerSecond: 1000 };

describe('consume', () => {
  it('allows a burst up to capacity, then refuses', async () => {
    const key = `burst-${Math.random()}`;
    const allowed = [
      await consume(key, { ...bucket, refillPerSecond: 0 }, db),
      await consume(key, { ...bucket, refillPerSecond: 0 }, db),
      await consume(key, { ...bucket, refillPerSecond: 0 }, db),
      await consume(key, { ...bucket, refillPerSecond: 0 }, db),
    ];
    expect(allowed).toEqual([true, true, true, false]);
  });

  it('refills over time', async () => {
    const key = `refill-${Math.random()}`;
    for (let i = 0; i < 3; i++) await consume(key, bucket, db);

    // 1000 tokens a second means the next millisecond buys one back.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await consume(key, bucket, db)).toBe(true);
  });

  it('keeps one caller from spending another caller tokens', async () => {
    const mine = `a-${Math.random()}`;
    const yours = `b-${Math.random()}`;
    for (let i = 0; i < 4; i++) await consume(mine, { ...bucket, refillPerSecond: 0 }, db);

    expect(await consume(yours, { ...bucket, refillPerSecond: 0 }, db)).toBe(true);
  });

  it('does not push updated_at forward on a refused request', async () => {
    const key = `starve-${Math.random()}`;
    const drain = { capacity: 1, refillPerSecond: 100 };
    expect(await consume(key, drain, db)).toBe(true);

    // Hammering while empty must not keep resetting the refill clock, which is
    // what a limiter that clamped at zero instead of refusing would do.
    for (let i = 0; i < 5; i++) await consume(key, drain, db);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(await consume(key, drain, db)).toBe(true);
  });
});

describe('clientKey', () => {
  it('charges the client, not the proxies behind it', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });
    expect(clientKey(headers, 'graphql')).toBe('graphql:203.0.113.7');
  });

  it('charges a shared key when the header is missing rather than letting it through', () => {
    expect(clientKey(new Headers(), 'login')).toBe('login:unknown');
  });
});
