import { PGlite } from '@electric-sql/pglite';
import { execute, parse } from 'graphql';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as dbSchema from '@/db/schema';
import { createLoaders } from '../loaders';
import { schema } from './index';

type Hit = { kind: string; title: string; subtitle: string | null; href: string };
type Db = ReturnType<typeof drizzle<typeof dbSchema>>;
let db: Db;

async function search(query: string): Promise<Hit[]> {
  const result = await execute({
    schema,
    document: parse('query ($q: String!) { search(query: $q) { kind title subtitle href } }'),
    variableValues: { q: query },
    contextValue: { db, loaders: createLoaders(db), session: null },
  });
  if (result.errors?.length) throw result.errors[0];
  return (result.data as { search: Hit[] }).search;
}

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema: dbSchema });
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  await db.insert(dbSchema.seasons).values({ year: 2025 });
  await db.insert(dbSchema.teams).values({ name: 'Red Bull Racing', color: '#3671C6' });
  await db.insert(dbSchema.drivers).values({ code: 'HAM', name: 'Lewis Hamilton', country: 'GBR' });

  const [circuit] = await db.insert(dbSchema.circuits).values({
    ergastCircuitId: 'monaco', name: 'Circuit de Monaco',
    locality: 'Monte-Carlo', country: 'Monaco',
  }).returning();

  const [meeting] = await db.insert(dbSchema.meetings).values({
    seasonYear: 2025, round: 8, name: 'Monaco Grand Prix', country: 'Monaco',
    startDate: new Date('2025-05-23T00:00:00Z'), openf1MeetingKey: 8, circuitId: circuit.id,
  }).returning();

  await db.insert(dbSchema.races).values({
    meetingId: meeting.id, type: 'GRAND_PRIX', slug: '2025-monaco',
    date: new Date('2025-05-25T13:00:00Z'), laps: 78, openf1SessionKey: 8,
  });
});

describe('search', () => {
  it('returns nothing for a term too short to be a search', async () => {
    expect(await search('m')).toEqual([]);
    expect(await search('  ')).toEqual([]);
  });

  it('matches across all four kinds and builds the URL each page expects', async () => {
    const hits = await search('monaco');
    // The circuit's locality and country both say Monaco; the meeting name and
    // the race slug do too. One term, three kinds, no duplicates within a kind.
    expect(hits.map((hit) => [hit.kind, hit.href])).toEqual([
      ['RACE', '/races/2025-monaco'],
      ['CIRCUIT', '/circuits/monaco'],
    ]);
    expect(hits[0].title).toBe('2025 Monaco Grand Prix');
    expect(hits[1].subtitle).toBe('Monte-Carlo, Monaco');
  });

  it('finds a driver by code as well as by name', async () => {
    expect((await search('ham'))[0]).toEqual({
      kind: 'DRIVER', title: 'Lewis Hamilton', subtitle: 'HAM · GBR', href: '/drivers/HAM',
    });
    expect((await search('hamilton'))[0].href).toBe('/drivers/HAM');
  });

  it('encodes a team name, which is what its route carries', async () => {
    expect((await search('red bull'))[0]).toEqual({
      kind: 'TEAM', title: 'Red Bull Racing', subtitle: null, href: '/teams/Red%20Bull%20Racing',
    });
  });
});
