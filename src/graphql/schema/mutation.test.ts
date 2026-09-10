import { PGlite } from '@electric-sql/pglite';
import { execute, parse } from 'graphql';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as dbSchema from '@/db/schema';
import { createLoaders } from '../loaders';
import type { Session } from '../context';
import { schema } from './index';

/**
 * The guards on the admin fields.
 *
 * These are the highest-value tests in the milestone, because the failure they
 * catch is silent. `/api/graphql` is one public URL: a mutation missing its
 * `requireSession` call works perfectly through the admin UI forever, since the
 * UI only reaches it from behind the proxy. Nothing surfaces the gap until
 * someone POSTs to the endpoint directly.
 *
 * So every admin field is asserted to reject an anonymous caller, and the
 * assertion is that it *throws* rather than returning empty — a field that
 * returns null to a stranger is indistinguishable from a field with no data.
 */
type Db = ReturnType<typeof drizzle<typeof dbSchema>>;
let db: Db;

const ADMIN: Session = { userId: 'test-admin', email: 'admin@example.com' };

async function run<T>(
  document: string,
  session: Session,
  variableValues?: Record<string, unknown>,
): Promise<T> {
  const result = await execute({
    schema,
    document: parse(document),
    variableValues,
    contextValue: { db, loaders: createLoaders(db), session },
  });
  if (result.errors?.length) throw result.errors[0];
  return result.data as T;
}

// Fresh per test: these mutate, so a shared database would make the suite
// order-dependent — the exact failure PGlite's per-suite instance exists to
// avoid.
beforeEach(async () => {
  db = drizzle(new PGlite(), { schema: dbSchema });
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  await db.insert(dbSchema.seasons).values({ year: 2025 });

  const [monaco] = await db.insert(dbSchema.meetings).values({
    seasonYear: 2025, round: 1, name: 'Monaco Grand Prix', country: 'Monaco',
    circuitName: 'Monte Carlo', startDate: new Date('2025-05-25T00:00:00Z'),
  }).returning();

  const [silverstone] = await db.insert(dbSchema.meetings).values({
    seasonYear: 2025, round: 2, name: 'British Grand Prix', country: 'UK',
    startDate: new Date('2025-07-06T00:00:00Z'),
  }).returning();

  await db.insert(dbSchema.races).values([
    {
      meetingId: monaco.id, type: 'GRAND_PRIX', slug: '2025-monaco',
      date: new Date('2025-05-25T13:00:00Z'), laps: 78, isFeatured: true,
    },
    {
      meetingId: silverstone.id, type: 'GRAND_PRIX', slug: '2025-silverstone',
      date: new Date('2025-07-06T14:00:00Z'), laps: 52,
    },
  ]);
});

describe('admin fields reject an anonymous caller', () => {
  const cases: [string, string][] = [
    ['ingestRuns', '{ ingestRuns { id status } }'],
    ['setRaceFeatured', 'mutation { setRaceFeatured(slug: "2025-monaco", featured: true) { slug } }'],
    ['updateRaceMetadata', 'mutation { updateRaceMetadata(slug: "2025-monaco", laps: 70) { slug } }'],
    // triggerIngest reaches the network if the guard is missing, so this also
    // asserts the check happens *before* any work starts.
    ['triggerIngest', 'mutation { triggerIngest(sessionKey: 1) { slug } }'],
  ];

  for (const [name, document] of cases) {
    it(`${name} throws without a session`, async () => {
      await expect(run(document, null)).rejects.toThrow('Unauthorized');
    });
  }

  it('leaves the data untouched when it rejects', async () => {
    await expect(
      run('mutation { setRaceFeatured(slug: "2025-silverstone", featured: true) { slug } }', null),
    ).rejects.toThrow('Unauthorized');

    const rows = await db.select().from(dbSchema.races)
      .where(eq(dbSchema.races.slug, '2025-silverstone'));
    expect(rows[0].isFeatured).toBe(false);
  });
});

describe('setRaceFeatured', () => {
  it('unfeatures every other race, so the landing page cannot pick by row order', async () => {
    await run('mutation { setRaceFeatured(slug: "2025-silverstone", featured: true) { slug } }', ADMIN);

    const rows = await db.select().from(dbSchema.races);
    const featured = rows.filter((row) => row.isFeatured).map((row) => row.slug);
    expect(featured).toEqual(['2025-silverstone']);
  });

  it('clears the flag without featuring anything else', async () => {
    await run('mutation { setRaceFeatured(slug: "2025-monaco", featured: false) { slug } }', ADMIN);

    const rows = await db.select().from(dbSchema.races);
    expect(rows.filter((row) => row.isFeatured)).toHaveLength(0);
  });

  it('rejects an unknown slug rather than silently doing nothing', async () => {
    await expect(
      run('mutation { setRaceFeatured(slug: "nope", featured: true) { slug } }', ADMIN),
    ).rejects.toThrow('No race with slug nope');
  });
});

describe('updateRaceMetadata', () => {
  it('updates the race and its meeting together', async () => {
    await run(
      `mutation {
        updateRaceMetadata(slug: "2025-monaco", laps: 77, name: "Monaco GP", circuitName: "Circuit de Monaco") {
          laps
          meeting { name circuitName country }
        }
      }`,
      ADMIN,
    );

    const [race] = await db.select().from(dbSchema.races)
      .where(eq(dbSchema.races.slug, '2025-monaco'));
    const [meeting] = await db.select().from(dbSchema.meetings)
      .where(eq(dbSchema.meetings.id, race.meetingId));

    expect(race.laps).toBe(77);
    expect(meeting.name).toBe('Monaco GP');
    expect(meeting.circuitName).toBe('Circuit de Monaco');
    // Not passed, so not touched — an omitted argument is not "set to null".
    expect(meeting.country).toBe('Monaco');
  });

  it('treats an empty circuitName as clearing it, since that column is nullable', async () => {
    await run('mutation { updateRaceMetadata(slug: "2025-monaco", circuitName: "") { slug } }', ADMIN);

    const [race] = await db.select().from(dbSchema.races)
      .where(eq(dbSchema.races.slug, '2025-monaco'));
    const [meeting] = await db.select().from(dbSchema.meetings)
      .where(eq(dbSchema.meetings.id, race.meetingId));
    expect(meeting.circuitName).toBeNull();
  });

  it('does not blank a notNull column when given whitespace', async () => {
    await run('mutation { updateRaceMetadata(slug: "2025-monaco", name: "   ") { slug } }', ADMIN);

    const [race] = await db.select().from(dbSchema.races)
      .where(eq(dbSchema.races.slug, '2025-monaco'));
    const [meeting] = await db.select().from(dbSchema.meetings)
      .where(eq(dbSchema.meetings.id, race.meetingId));
    expect(meeting.name).toBe('Monaco Grand Prix');
  });

  it('rejects a negative lap count', async () => {
    await expect(
      run('mutation { updateRaceMetadata(slug: "2025-monaco", laps: -1) { slug } }', ADMIN),
    ).rejects.toThrow('laps cannot be negative');
  });

  it('accepts zero laps, which is what a race nobody ran has', async () => {
    // The editor's whole purpose is corrections like marking a cancelled race
    // CANCELLED, and the form posts the laps it is showing — 0 for such a race.
    await run(
      'mutation { updateRaceMetadata(slug: "2025-monaco", laps: 0, status: "CANCELLED") { slug } }',
      ADMIN,
    );

    const [race] = await db.select().from(dbSchema.races)
      .where(eq(dbSchema.races.slug, '2025-monaco'));
    expect(race.status).toBe('CANCELLED');
    expect(race.laps).toBe(0);
    expect(race.adminEdited).toEqual(expect.arrayContaining(['laps', 'status']));
  });
});
