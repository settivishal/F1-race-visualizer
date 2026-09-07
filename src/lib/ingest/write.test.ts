import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as dbSchema from '@/db/schema';
import { writeRace } from './run';
import type { TransformedRace } from './types';

/**
 * The two upstreams writing the same rows.
 *
 * This is the failure the archive makes possible and nothing else could: OpenF1
 * knows the livery and the session key, Ergast knows the grid and the circuit,
 * and each import must leave the other's columns standing. Assigning instead of
 * coalescing produces a database whose contents depend on which import ran last
 * — plausible-looking, wrong, and invisible until someone notices Ferrari has
 * gone grey.
 *
 * Against PGlite with the real migrations, so the constraints are the real ones.
 */
type Db = ReturnType<typeof drizzle<typeof dbSchema>>;
let db: Db;

const base = {
  meeting: {
    seasonYear: 2019,
    round: 1,
    name: 'Australian Grand Prix',
    country: 'Australia',
    circuitName: 'Melbourne',
    startDate: new Date('2019-03-17T05:10:00Z'),
    weather: null,
    openf1MeetingKey: null as number | null,
  },
  race: {
    type: 'GRAND_PRIX' as const,
    slug: '2019-melbourne',
    date: new Date('2019-03-17T05:10:00Z'),
    laps: 58,
    openf1SessionKey: null as number | null,
  },
  positions: [],
  events: [],
  stints: [],
  pitStops: [],
  warnings: [],
};

/** What an OpenF1 import of this race looks like: livery, keys, no grid. */
const fromOpenF1: TransformedRace = {
  ...base,
  meeting: { ...base.meeting, openf1MeetingKey: 1234, weather: [{ air_temperature: 21 }] },
  race: { ...base.race, openf1SessionKey: 9999, dataTier: 'FULL' },
  lineup: [{
    driverNumber: 44, code: 'HAM', name: 'Lewis Hamilton', country: 'GBR',
    headshotUrl: 'https://example.test/ham.png',
    teamName: 'Mercedes', teamColor: '#00D7B6',
  }],
  results: [{
    driverNumber: 44, finalPosition: 2, status: 'FINISHED',
    lapsCompleted: 58, points: 18, fastestLap: false,
  }],
};

/** What an Ergast import of the same race looks like: grid, circuit, no livery. */
const fromErgast: TransformedRace = {
  ...base,
  meeting: {
    ...base.meeting,
    circuit: {
      ergastCircuitId: 'albert_park', name: 'Albert Park Grand Prix Circuit',
      locality: 'Melbourne', country: 'Australia', latitude: -37.8497, longitude: 144.968,
    },
  },
  race: { ...base.race, dataTier: 'LAPS', ergastRound: 1 },
  lineup: [{
    driverNumber: 44, code: 'HAM', name: 'Lewis Hamilton', country: 'British',
    headshotUrl: null,
    teamName: 'Mercedes', teamColor: null,
    ergastDriverId: 'hamilton', ergastConstructorId: 'mercedes',
  }],
  results: [{
    driverNumber: 44, finalPosition: 2, status: 'FINISHED',
    lapsCompleted: 58, points: 18, fastestLap: false, gridPosition: 1,
  }],
};

beforeEach(async () => {
  db = drizzle(new PGlite(), { schema: dbSchema });
  await migrate(db, { migrationsFolder: './src/db/migrations' });
});

const raceRow = () => db.query.races.findFirst({ where: eq(dbSchema.races.slug, '2019-melbourne') });
const teamRow = () => db.query.teams.findFirst({ where: eq(dbSchema.teams.name, 'Mercedes') });
const meetingRow = () =>
  db.query.meetings.findFirst({ where: eq(dbSchema.meetings.round, 1) });
const resultRow = async () => {
  const rows = await db.select().from(dbSchema.raceResults);
  return rows[0];
};

describe('two upstreams, one race', () => {
  it('meets on the same row rather than inserting a second one', async () => {
    await writeRace(fromOpenF1, db);
    await writeRace(fromErgast, db);

    expect(await db.select().from(dbSchema.races)).toHaveLength(1);
    expect(await db.select().from(dbSchema.meetings)).toHaveLength(1);
  });

  it('keeps the livery when an import that has none writes over it', async () => {
    await writeRace(fromOpenF1, db);
    await writeRace(fromErgast, db);

    // The failure this exists for: Ergast publishes no colour, and assigning
    // would blank a team's colour across every season it has ever raced.
    expect((await teamRow())?.color).toBe('#00D7B6');
    expect((await teamRow())?.ergastConstructorId).toBe('mercedes');
  });

  it('does not let the archive\'s guessed colour overwrite the timing feed\'s', async () => {
    await writeRace(fromOpenF1, db);
    await writeRace(
      { ...fromErgast, lineup: [{ ...fromErgast.lineup[0], teamColor: '#123456' }] },
      db,
    );

    // The archive's colours are a hand-maintained lookup — enough to make a
    // 2019 chart readable, not a correction to a colour read off the feed.
    expect((await teamRow())?.color).toBe('#00D7B6');
  });

  it('still takes the archive colour for a team OpenF1 has never seen', async () => {
    await writeRace(
      {
        ...fromErgast,
        lineup: [{
          ...fromErgast.lineup[0],
          teamName: 'Racing Point', teamColor: '#F596C8',
          ergastConstructorId: 'racing_point',
        }],
      },
      db,
    );

    const team = await db.query.teams.findFirst({
      where: eq(dbSchema.teams.name, 'Racing Point'),
    });
    expect(team?.color).toBe('#F596C8');
  });

  it('keeps the grid when the OpenF1 import runs second', async () => {
    await writeRace(fromErgast, db);
    await writeRace(fromOpenF1, db);

    // OpenF1 publishes no starting grid at all. Re-importing a 2023+ race must
    // not erase the one the archive filled in.
    expect((await resultRow()).gridPosition).toBe(1);
    // ...and the OpenF1 facts still land.
    expect((await raceRow())?.openf1SessionKey).toBe(9999);
    expect((await meetingRow())?.openf1MeetingKey).toBe(1234);
  });

  it('keeps the circuit and the weather, each known to only one source', async () => {
    await writeRace(fromOpenF1, db);
    await writeRace(fromErgast, db);

    const meeting = await meetingRow();
    expect(meeting?.circuitId).not.toBeNull();
    expect(meeting?.weather).not.toBeNull();

    const circuit = await db.query.circuits.findFirst();
    expect(circuit?.ergastCircuitId).toBe('albert_park');
    expect(circuit?.locality).toBe('Melbourne');
  });

  it('lets the last writer set the tier, since that is a claim about itself', async () => {
    await writeRace(fromErgast, db);
    expect((await raceRow())?.dataTier).toBe('LAPS');

    // An OpenF1 re-import means this race now *has* sectors and stints, so it
    // is a FULL race — the tier is not something to preserve.
    await writeRace(fromOpenF1, db);
    expect((await raceRow())?.dataTier).toBe('FULL');
  });

  it('is idempotent: importing twice changes no row counts', async () => {
    await writeRace(fromErgast, db);
    const first = await db.select().from(dbSchema.raceResults);

    await writeRace(fromErgast, db);
    const second = await db.select().from(dbSchema.raceResults);

    expect(second).toHaveLength(first.length);
    expect(await db.select().from(dbSchema.drivers)).toHaveLength(1);
    expect(await db.select().from(dbSchema.circuits)).toHaveLength(1);
  });
});
