import { PGlite } from '@electric-sql/pglite';
import { execute, parse } from 'graphql';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as dbSchema from '@/db/schema';
import { createLoaders } from '../loaders';
import { schema } from './index';

/**
 * Resolvers are tested through execute() — the same entry point server
 * components use — against PGlite: real Postgres in-process, with the real
 * migrations applied. So these exercise the real schema, the real resolvers
 * and real SQL rather than a mock, and a broken migration fails the run.
 */
type Db = ReturnType<typeof drizzle<typeof dbSchema>>;
let db: Db;

async function run<T>(document: string, variableValues?: Record<string, unknown>): Promise<T> {
  const result = await execute({
    schema,
    document: parse(document),
    variableValues,
    contextValue: { db, loaders: createLoaders(db), session: null },
  });
  if (result.errors?.length) throw result.errors[0];
  return result.data as T;
}

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema: dbSchema });
  await migrate(db, { migrationsFolder: './src/db/migrations' });

  await db.insert(dbSchema.seasons).values({ year: 2025 });

  const [ferrari] = await db.insert(dbSchema.teams)
    .values({ name: 'Ferrari', color: '#DC0000' }).returning();
  const [mclaren] = await db.insert(dbSchema.teams)
    .values({ name: 'McLaren', color: '#FF8000' }).returning();

  const [leclerc] = await db.insert(dbSchema.drivers)
    .values({ code: 'LEC', name: 'Charles Leclerc', number: 16 }).returning();
  const [norris] = await db.insert(dbSchema.drivers)
    .values({ code: 'NOR', name: 'Lando Norris', number: 4 }).returning();

  const [ferrari25] = await db.insert(dbSchema.teamSeasons)
    .values({ seasonYear: 2025, teamId: ferrari.id, color: '#E8002D' }).returning();
  const [mclaren25] = await db.insert(dbSchema.teamSeasons)
    .values({ seasonYear: 2025, teamId: mclaren.id }).returning();

  const [lecSeat] = await db.insert(dbSchema.driverTeamAssignments)
    .values({ teamSeasonId: ferrari25.id, driverId: leclerc.id }).returning();
  const [norSeat] = await db.insert(dbSchema.driverTeamAssignments)
    .values({ teamSeasonId: mclaren25.id, driverId: norris.id }).returning();

  const [meeting] = await db.insert(dbSchema.meetings).values({
    seasonYear: 2025, round: 1, name: 'Test Grand Prix', country: 'Testland',
    startDate: new Date('2025-03-01T00:00:00Z'), openf1MeetingKey: 1,
  }).returning();

  const [race] = await db.insert(dbSchema.races).values({
    meetingId: meeting.id, type: 'GRAND_PRIX', slug: '2025-test',
    date: new Date('2025-03-02T14:00:00Z'), laps: 3, openf1SessionKey: 1,
  }).returning();

  // Lap 2 is deliberately absent and lap 3 has one car in P2 with no P1: both
  // shapes occur in the real 2025 data and the resolvers must not assume
  // otherwise.
  await db.insert(dbSchema.racePositions).values([
    { raceId: race.id, lap: 1, assignmentId: lecSeat.id, position: 1, lapTime: 92.1 },
    { raceId: race.id, lap: 1, assignmentId: norSeat.id, position: 2, lapTime: 92.8 },
    { raceId: race.id, lap: 3, assignmentId: norSeat.id, position: 2, lapTime: 91.5 },
  ]);

  await db.insert(dbSchema.raceResults).values([
    { raceId: race.id, assignmentId: lecSeat.id, finalPosition: 1, status: 'FINISHED', points: 25, lapsCompleted: 3 },
    { raceId: race.id, assignmentId: norSeat.id, finalPosition: null, status: 'DNF', points: 0, lapsCompleted: 2 },
  ]);

  // A sprint in the same meeting: Norris wins it. Nothing about that belongs in
  // a published win or podium count, so the standings below must not see it —
  // only its points.
  const [sprint] = await db.insert(dbSchema.races).values({
    meetingId: meeting.id, type: 'SPRINT', slug: '2025-test-sprint',
    date: new Date('2025-03-01T14:00:00Z'), laps: 2, openf1SessionKey: 2,
  }).returning();

  await db.insert(dbSchema.raceResults).values([
    { raceId: sprint.id, assignmentId: norSeat.id, finalPosition: 1, status: 'FINISHED', points: 8, lapsCompleted: 2 },
    { raceId: sprint.id, assignmentId: lecSeat.id, finalPosition: 2, status: 'FINISHED', points: 7, lapsCompleted: 2 },
  ]);

  // Norris pits on lap 1. Lap 2 has no rows at all, so lap 3 is the next lap he
  // recorded and therefore his out-lap — the case the missing-lap rule exists
  // for.
  await db.insert(dbSchema.pitStops).values([
    { raceId: race.id, assignmentId: norSeat.id, lap: 1, durationMs: 23400 },
  ]);

  await db.insert(dbSchema.stints).values([
    { raceId: race.id, assignmentId: norSeat.id, stintNumber: 1, lapStart: 1, lapEnd: 1, compound: 'MEDIUM', tyreAgeAtStart: 0 },
    { raceId: race.id, assignmentId: norSeat.id, stintNumber: 2, lapStart: 2, lapEnd: 3, compound: 'HARD', tyreAgeAtStart: 2 },
  ]);

  await db.insert(dbSchema.raceEvents).values([
    { raceId: race.id, lap: 2, assignmentId: null, type: 'SAFETY_CAR', details: 'Safety car deployed' },
    { raceId: race.id, lap: 3, assignmentId: norSeat.id, type: 'RETIREMENT', details: 'Engine' },
  ]);
});

describe('race', () => {
  it('resolves a driver and team through the assignment, which the schema never exposes', async () => {
    const data = await run<{ race: { positions: { driver: { code: string }; team: { name: string; color: string } }[] } }>(`
      query { race(slug: "2025-test") { positions(lap: 1) { position driver { code } team { name color } } } }
    `);
    expect(data.race.positions.map((p) => p.driver.code)).toEqual(['LEC', 'NOR']);
    // The per-season livery wins over teams.color where one exists.
    expect(data.race.positions[0].team).toEqual({ name: 'Ferrari', color: '#E8002D' });
    // McLaren's team_season has no colour, so it falls back to the team's.
    expect(data.race.positions[1].team).toEqual({ name: 'McLaren', color: '#FF8000' });
  });

  it('reports the laps that exist rather than a 1..N range', async () => {
    const data = await run<{ race: { replay: { laps: number[]; summary: { lapCount: number; maxLap: number; driverCount: number } } } }>(`
      query { race(slug: "2025-test") { replay { laps summary { lapCount maxLap driverCount } } } }
    `);
    // Lap 2 has no position rows, so it is absent — not interpolated, not zero.
    expect(data.race.replay.laps).toEqual([1, 3]);
    expect(data.race.replay.summary).toEqual({ lapCount: 2, maxLap: 3, driverCount: 2 });
  });

  it('pivots the replay by driver, each series in lap order', async () => {
    const data = await run<{ race: { replay: { drivers: { driver: { code: string }; positions: { lap: number }[] }[] } } }>(`
      query { race(slug: "2025-test") { replay { drivers { driver { code } positions { lap } } } } }
    `);
    const norrisSeries = data.race.replay.drivers.find((d) => d.driver.code === 'NOR');
    expect(norrisSeries!.positions.map((p) => p.lap)).toEqual([1, 3]);
  });

  it('keeps a race-wide event, which has no driver', async () => {
    const data = await run<{ race: { events: { type: string; driver: { code: string } | null }[] } }>(`
      query { race(slug: "2025-test") { events { type driver { code } } } }
    `);
    expect(data.race.events).toEqual([
      { type: 'SAFETY_CAR', driver: null },
      { type: 'RETIREMENT', driver: { code: 'NOR' } },
    ]);
  });

  it('sorts an unclassified finisher last rather than first', async () => {
    const data = await run<{ race: { results: { status: string; finalPosition: number | null }[] } }>(`
      query { race(slug: "2025-test") { results { status finalPosition } } }
    `);
    // A null final_position must not sort ahead of P1.
    expect(data.race.results).toEqual([
      { status: 'FINISHED', finalPosition: 1 },
      { status: 'DNF', finalPosition: null },
    ]);
  });

  it('returns null for a slug that does not exist', async () => {
    const data = await run<{ race: null }>('query { race(slug: "nope") { slug } }');
    expect(data.race).toBeNull();
  });
});

describe('analysis', () => {
  it('returns a lap-time series per driver, in lap order', async () => {
    const data = await run<{ race: { analysis: { lapTimes: { driver: { code: string }; laps: { lap: number; time: number }[] }[] } } }>(`
      query { race(slug: "2025-test") { analysis { lapTimes { driver { code } laps { lap time } } } } }
    `);
    const norris = data.race.analysis.lapTimes.find((d) => d.driver.code === 'NOR');
    expect(norris!.laps.map((l) => l.lap)).toEqual([1, 3]);
  });

  it('flags a pit lap and its out-lap rather than deleting them', async () => {
    const data = await run<{ race: { analysis: { lapTimes: { driver: { code: string }; laps: { lap: number; isOutlier: boolean }[]; pace: { lapsCounted: number; lapsExcluded: number; best: number } }[] } } }>(`
      query {
        race(slug: "2025-test") {
          analysis { lapTimes { driver { code } laps { lap isOutlier } pace { lapsCounted lapsExcluded best } } }
        }
      }
    `);
    const norris = data.race.analysis.lapTimes.find((d) => d.driver.code === 'NOR')!;
    // Both of his laps are still in the series — a chart with a hole in it looks
    // like missing data, which is a different fact.
    expect(norris.laps).toHaveLength(2);
    expect(norris.laps.every((l) => l.isOutlier)).toBe(true);
    expect(norris.pace.lapsCounted).toBe(0);
    expect(norris.pace.lapsExcluded).toBe(2);
    // The best lap survives the exclusion: a fast lap is a fact, not noise.
    expect(norris.pace.best).toBe(91.5);
  });

  it('returns stints with their compound', async () => {
    const data = await run<{ race: { analysis: { stints: { driver: { code: string }; compound: string; lapStart: number; lapEnd: number }[] } } }>(`
      query { race(slug: "2025-test") { analysis { stints { driver { code } compound lapStart lapEnd } } } }
    `);
    expect(data.race.analysis.stints).toEqual([
      { driver: { code: 'NOR' }, compound: 'MEDIUM', lapStart: 1, lapEnd: 1 },
      { driver: { code: 'NOR' }, compound: 'HARD', lapStart: 2, lapEnd: 3 },
    ]);
  });

  it('converts a stored millisecond duration to seconds on the wire', async () => {
    const data = await run<{ race: { analysis: { pitStops: { lap: number; durationSeconds: number }[] } } }>(`
      query { race(slug: "2025-test") { analysis { pitStops { lap durationSeconds } } } }
    `);
    expect(data.race.analysis.pitStops).toEqual([{ lap: 1, durationSeconds: 23.4 }]);
  });

  it('compares two drivers lap by lap', async () => {
    const data = await run<{ race: { analysis: { headToHead: { lapsAheadA: number; lapsAheadB: number; laps: { lap: number; positionDelta: number | null }[]; a: { finalPosition: number | null } } } } }>(`
      query {
        race(slug: "2025-test") {
          analysis {
            headToHead(driverA: "LEC", driverB: "NOR") {
              lapsAheadA lapsAheadB
              a { finalPosition }
              laps { lap positionDelta }
            }
          }
        }
      }
    `);
    const h = data.race.analysis.headToHead;
    expect(h.lapsAheadA).toBe(1);            // lap 1, P1 against P2
    expect(h.lapsAheadB).toBe(0);
    expect(h.a.finalPosition).toBe(1);
    // Lap 3 has no Leclerc row, so the comparison has no answer rather than a
    // zero — a null gap is not a dead heat.
    expect(h.laps.find((l) => l.lap === 3)!.positionDelta).toBeNull();
  });

  it('is null when a driver did not start the race', async () => {
    const data = await run<{ race: { analysis: { headToHead: null } } }>(`
      query { race(slug: "2025-test") { analysis { headToHead(driverA: "LEC", driverB: "VER") { lapsAheadA } } } }
    `);
    expect(data.race.analysis.headToHead).toBeNull();
  });
});

describe('standings', () => {
  it('derives points, wins and podiums without storing them', async () => {
    const data = await run<{ driverStandings: { position: number; driver: { code: string }; points: number; wins: number; podiums: number }[] }>(`
      query { driverStandings(season: 2025) { position driver { code } points wins podiums } }
    `);
    // Sprint points count — the championship counts them — but the sprint win
    // and the sprint second place do not reach the win and podium columns.
    expect(data.driverStandings).toEqual([
      { position: 1, driver: { code: 'LEC' }, points: 32, wins: 1, podiums: 1 },
      { position: 2, driver: { code: 'NOR' }, points: 8, wins: 0, podiums: 0 },
    ]);
  });

  it('ranks constructors from the same results', async () => {
    const data = await run<{ constructorStandings: { position: number; team: { name: string }; points: number }[] }>(`
      query { constructorStandings(season: 2025) { position team { name } points } }
    `);
    expect(data.constructorStandings[0]).toEqual({ position: 1, team: { name: 'Ferrari' }, points: 32 });
  });
});

describe('races pagination', () => {
  it('pages with a keyset cursor and reports whether more remain', async () => {
    const first = await run<{ races: { edges: { node: { slug: string }; cursor: string }[]; pageInfo: { hasNextPage: boolean } } }>(`
      query { races(first: 1) { edges { node { slug } cursor } pageInfo { hasNextPage endCursor } } }
    `);
    expect(first.races.edges).toHaveLength(1);
    // Two races are seeded — the grand prix and its sprint — so one page of one
    // leaves another behind.
    expect(first.races.pageInfo.hasNextPage).toBe(true);
  });

  it('filters by season', async () => {
    const data = await run<{ races: { edges: unknown[] } }>(
      'query { races(season: 2024) { edges { node { slug } } } }',
    );
    expect(data.races.edges).toEqual([]);
  });
});
