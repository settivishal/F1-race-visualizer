import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as dbSchema from '@/db/schema';

/**
 * The HTTP transport, which had no test at all.
 *
 * `docs/decisions.md:667` predicted exactly this: the depth limit, the cost
 * limit and the introspection switch are the three things standing between a
 * public unauthenticated GraphQL endpoint and an expensive query, and all three
 * were configuration nobody had ever exercised. A typo in any of them fails
 * open — the endpoint keeps working, and only an attacker finds out.
 *
 * These go through the route handler rather than `executeQuery`, because the
 * plugins are Yoga's and the in-process entry point does not have them.
 */

let db: ReturnType<typeof drizzle<typeof dbSchema>>;

// The route builds its context from a session and a database. Neither is what
// is under test here, so both are stubbed to the shapes the resolvers expect.
vi.mock('@/auth', () => ({ auth: async () => null }));
vi.mock('@/db', async () => {
  const actual = await vi.importActual<typeof import('@/db')>('@/db');
  return { ...actual, getDb: () => db };
});

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema: dbSchema });
  await migrate(db, { migrationsFolder: './src/db/migrations' });
});

async function post(query: string) {
  const { POST } = await import('./route');
  const response = await POST(
    new Request('http://localhost/api/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    }),
  );
  return { status: response.status, body: await response.json() };
}

const errorText = (body: unknown) =>
  JSON.stringify((body as { errors?: unknown[] }).errors ?? []);

/**
 * `k` turns of the Race -> Meeting -> races cycle, which is what the depth
 * limit exists for: a short query can nest it arbitrarily and buy exponential
 * work.
 */
const nested = (k: number) => {
  let inner = 'name';
  for (let i = 0; i < k; i += 1) inner = `races { meeting { ${inner} } }`;
  return `{ races { edges { node { meeting { ${inner} } } } } }`;
};

describe('the GraphQL endpoint', () => {
  it('answers an ordinary query', async () => {
    const { body } = await post('{ seasons { year } }');
    expect(body).toEqual({ data: { seasons: [] } });
  });

  it('allows the nesting a real page uses', async () => {
    const { status } = await post(nested(2));
    expect(status).toBe(200);
  });

  it('rejects a query nested past the depth limit', async () => {
    // One turn further round the cycle is the boundary. Asserting on both sides
    // of it is what makes this a test of the plugin rather than of some other
    // error that happens to fail the same way.
    const { status, body } = await post(nested(3));

    expect(status).toBe(500);
    expect(body).not.toHaveProperty('data.races');
    // The message is masked — Yoga does not hand a client the plugin's text —
    // so the status and the absence of data are all there is to assert. That is
    // also what an attacker sees, which is the point.
    expect(errorText(body)).toMatch(/error/i);
  });

  it('rejects a query that costs too much, however shallow', async () => {
    // Aliasing is how a cheap-looking query becomes an expensive one, and depth
    // alone does not see it.
    const aliases = Array.from(
      { length: 60 },
      (_, i) => `r${i}: races(first: 100) { edges { node { id slug laps } } }`,
    ).join('\n');

    const { status } = await post(`{ ${aliases} }`);
    expect(status).toBe(500);

    // And the same query at a tenth the size is fine, so this is the cost limit
    // and not simply "a big query breaks".
    const few = Array.from(
      { length: 3 },
      (_, i) => `r${i}: races(first: 5) { edges { node { id slug } } }`,
    ).join('\n');
    expect((await post(`{ ${few} }`)).status).toBe(200);
  });

  it('serves introspection in development, where GraphiQL needs it', async () => {
    const { body } = await post('{ __schema { queryType { name } } }');
    expect(body).toMatchObject({ data: { __schema: { queryType: { name: 'Query' } } } });
  });
});

describe('with NODE_ENV=production', () => {
  it('refuses introspection', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    // The route reads NODE_ENV at module scope, so it has to be loaded again
    // for the change to take effect.
    vi.resetModules();

    const { body } = await post('{ __schema { queryType { name } } }');
    expect(errorText(body)).toMatch(/introspection|not allowed|GraphQL/i);
    expect(body).not.toHaveProperty('data.__schema.queryType');

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
