import { cacheLife, cacheTag } from 'next/cache';
import { executeQuery } from '@/graphql/execute';
import type {
  ArchiveIndexQuery,
  CircuitProfileQuery,
  DriverProfileQuery,
  HomeFeatureQuery,
  RaceAnalysisQuery,
  TeamProfileQuery,
  HomeLineupQuery,
  RaceReplayQuery,
  RaceHeaderQuery,
  RaceLibraryQuery,
  RaceSlugsQuery,
  ActiveSeasonQuery,
  SeasonScheduleQuery,
  SeasonStandingsQuery,
} from '@/graphql/generated/graphql';

/**
 * The cached read path.
 *
 * Every function here is a `use cache` scope, which means two things worth
 * stating plainly. Its arguments become the cache key, so a filtered library
 * and an unfiltered one are separate entries. And it cannot touch `cookies()`,
 * `headers()` or `searchParams` — the restriction follows the call stack, so a
 * page reads those itself and passes the values down as arguments.
 *
 * Tags are what the ingest job will invalidate. `cacheLife('days')` is the
 * safety net underneath: races change weekly, so a day is short enough that
 * nothing goes stale for long even if a revalidation is missed, and long
 * enough that ordinary traffic never wakes the database.
 */

const HOME_LINEUP = /* GraphQL */ `
  query HomeLineup($season: Int!) {
    driverStandings(season: $season) {
      position
      points
      driver { code name number }
      team { name color }
    }
  }
`;

const RACE_LIBRARY = /* GraphQL */ `
  query RaceLibrary($season: Int, $search: String, $first: Int, $after: String) {
    races(season: $season, search: $search, first: $first, after: $after) {
      edges {
        cursor
        node {
          id slug date laps type isFeatured
          meeting { name country circuitName round season }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
    seasons { year }
  }
`;

const RACE_HEADER = /* GraphQL */ `
  query RaceHeader($slug: String!) {
    race(slug: $slug) {
      id slug date laps type
      meeting {
        name country circuitName round season
        circuit { ergastId name locality country lengthKm turns firstGrandPrix }
      }
      results {
        finalPosition lapsCompleted points status fastestLap
        driver { code name number }
        team { name color }
      }
    }
  }
`;

/**
 * The race the landing page leads with.
 *
 * `Query.races` orders by date ascending and takes no `featured` argument, so
 * the pick happens here rather than in SQL: the first race flagged featured if
 * there is one, otherwise the most recent. Nothing is flagged yet — the
 * mutation that sets it is M3 — so today this resolves to the latest race and
 * starts honouring the flag the moment one exists, with no change here.
 *
 * Asking for 100 rows of four fields to choose one is cheap next to adding a
 * resolver argument, and the whole thing is one cached entry for a day.
 */
const HOME_FEATURE = /* GraphQL */ `
  query HomeFeature {
    races(first: 100) {
      edges {
        node {
          id slug laps type isFeatured
          meeting { name country circuitName round season }
        }
      }
    }
  }
`;

const RACE_SLUGS = /* GraphQL */ `
  query RaceSlugs($first: Int) {
    races(first: $first) {
      edges { node { slug date } }
    }
  }
`;

export async function getDriverStandings(season: number) {
  'use cache';
  cacheTag('standings');
  cacheLife('days');

  return executeQuery<HomeLineupQuery, { season: number }>(HOME_LINEUP, { season });
}

const SEASON_STANDINGS = /* GraphQL */ `
  query SeasonStandings($season: Int!) {
    driverStandings(season: $season) {
      position
      points
      wins
      podiums
      driver { code name number }
      team { name color }
    }
    constructorStandings(season: $season) {
      position
      points
      wins
      team { name color }
    }
    seasons { year }
  }
`;

/**
 * Both championship tables for one season, plus the seasons the selector needs.
 * One scope rather than two: the page shows both, so splitting them would buy a
 * second cache entry and a second round trip for no page that wants half.
 */
export async function getSeasonStandings(season: number) {
  'use cache';
  cacheTag('standings');
  cacheLife('days');

  return executeQuery<SeasonStandingsQuery, { season: number }>(SEASON_STANDINGS, { season });
}

export async function getRaceLibrary(
  season: number | null,
  search: string | null,
  after: string | null,
) {
  'use cache';
  cacheTag('race');
  cacheLife('days');

  return executeQuery<RaceLibraryQuery, Record<string, unknown>>(RACE_LIBRARY, {
    season,
    search,
    first: 24,
    after,
  });
}

export async function getRaceHeader(slug: string) {
  'use cache';
  // Tagged twice: the broad tag so an ingest can invalidate every race at once,
  // and the narrow one so a single re-import does not evict the season.
  cacheTag('race', `race:${slug}`);
  cacheLife('days');

  return executeQuery<RaceHeaderQuery, { slug: string }>(RACE_HEADER, { slug });
}

const RACE_REPLAY = /* GraphQL */ `
  query RaceReplay($slug: String!) {
    race(slug: $slug) {
      id slug laps date type dataTier
      meeting { name country circuitName round season }
      replay {
        laps
        summary { lapCount maxLap maxPosition driverCount }
        drivers {
          driver { id code name number }
          team { id name color }
          positions { lap position gap lapTime sector1 sector2 sector3 }
        }
        events {
          lap type details
          driver { id code name number }
        }
      }
    }
  }
`;

/**
 * The replay payload: every lap of every driver, which is the one query in the
 * application large enough to matter. It is a separate scope from the header so
 * the classification is not held behind it, and so the two can be invalidated
 * together but fetched apart.
 */
export async function getRaceReplay(slug: string) {
  'use cache';
  cacheTag('race', `race:${slug}`);
  cacheLife('days');

  return executeQuery<RaceReplayQuery, { slug: string }>(RACE_REPLAY, { slug });
}

const RACE_ANALYSIS = /* GraphQL */ `
  query RaceAnalysis($slug: String!) {
    race(slug: $slug) {
      id slug laps dataTier
      meeting { name season }
      analysis {
        lapTimes {
          driver { id code name }
          team { id name color }
          laps { lap time isOutlier }
          pace { best median consistency lapsCounted lapsExcluded }
        }
        stints {
          stintNumber lapStart lapEnd compound
          driver { id code }
          team { color }
        }
        pitStops {
          lap durationSeconds
          driver { id code }
        }
      }
    }
  }
`;

/**
 * The Analysis tab. A third scope beside the header and the replay, for the same
 * reason those two are separate: a visitor who never opens the tab never pays
 * for it, and the tab does not wait on the replay's payload to render.
 */
export async function getRaceAnalysis(slug: string) {
  'use cache';
  cacheTag('race', `race:${slug}`);
  cacheLife('days');

  return executeQuery<RaceAnalysisQuery, { slug: string }>(RACE_ANALYSIS, { slug });
}

// ── The archive ───────────────────────────────────────────────────────
//
// Tagged `race` like everything else: a career total is an aggregate over race
// results, so the thing that invalidates it is an ingest, and there is no
// second tag that would be more precise.

const DRIVER_PROFILE = /* GraphQL */ `
  query DriverProfile($code: String!) {
    driver(code: $code) {
      driver { id code name number country }
      career {
        seasonCount starts wins podiums points bestFinish
        seasons {
          season starts wins podiums points bestFinish
          team { name color }
        }
      }
    }
  }
`;

export async function getDriverProfile(code: string) {
  'use cache';
  cacheTag('race', 'standings');
  cacheLife('days');

  return executeQuery<DriverProfileQuery, { code: string }>(DRIVER_PROFILE, { code });
}

const TEAM_PROFILE = /* GraphQL */ `
  query TeamProfile($name: String!) {
    team(name: $name) {
      team { id name color }
      drivers { code name }
      career {
        seasonCount starts wins podiums points bestFinish
        seasons { season starts wins podiums points bestFinish }
      }
    }
  }
`;

export async function getTeamProfile(name: string) {
  'use cache';
  cacheTag('race', 'standings');
  cacheLife('days');

  return executeQuery<TeamProfileQuery, { name: string }>(TEAM_PROFILE, { name });
}

const ACTIVE_SEASON = /* GraphQL */ `
  query ActiveSeason {
    activeSeason
  }
`;

/**
 * Which season the site is about, from `app_config` rather than a constant.
 *
 * Tagged `settings` as well as `race`: changing the season in the admin has to
 * drop this, or the home page keeps last season for a day. `updateConfigAction`
 * revalidates that tag.
 */
export async function getActiveSeason(): Promise<number> {
  'use cache';
  cacheTag('race', 'settings');
  cacheLife('days');

  const { activeSeason } = await executeQuery<ActiveSeasonQuery, Record<string, unknown>>(
    ACTIVE_SEASON,
    {},
  );
  return activeSeason;
}

const SEASON_SCHEDULE = /* GraphQL */ `
  query SeasonSchedule($season: Int!) {
    races(season: $season, first: 100) {
      edges {
        node {
          slug
          date
          type
          meeting { name round }
        }
      }
    }
  }
`;

/**
 * Every race of a season, for the home page's progress and countdown.
 *
 * `first: 100` rather than the library's 24: a season is at most 24 grands
 * prix plus six sprints, and a page boundary here would silently under-count
 * the season rather than showing a "next page" the caller could follow.
 */
export async function getSeasonSchedule(season: number) {
  'use cache';
  cacheTag('race');
  cacheLife('days');

  return executeQuery<SeasonScheduleQuery, { season: number }>(SEASON_SCHEDULE, { season });
}

const ARCHIVE_INDEX = /* GraphQL */ `
  query ArchiveIndex {
    seasons { year }
    drivers { id code name country }
    teams { id name color }
    circuits { id ergastId name locality country }
  }
`;

export async function getArchiveIndex() {
  'use cache';
  cacheTag('race');
  cacheLife('days');

  return executeQuery<ArchiveIndexQuery, Record<string, unknown>>(ARCHIVE_INDEX, {});
}

const CIRCUIT_PROFILE = /* GraphQL */ `
  query CircuitProfile($ergastId: String!) {
    circuit(ergastId: $ergastId) {
      id ergastId name locality country
      latitude longitude lengthKm turns firstGrandPrix
    }
  }
`;

export async function getCircuitProfile(ergastId: string) {
  'use cache';
  cacheTag('race');
  cacheLife('days');

  return executeQuery<CircuitProfileQuery, { ergastId: string }>(CIRCUIT_PROFILE, { ergastId });
}

export async function getFeaturedRace() {
  'use cache';
  cacheTag('race');
  cacheLife('days');

  const { races } = await executeQuery<HomeFeatureQuery, Record<string, unknown>>(
    HOME_FEATURE,
    {},
  );

  const nodes = races.edges.map((edge) => edge.node);
  return nodes.find((node) => node.isFeatured) ?? nodes.at(-1) ?? null;
}

export async function getRaceSlugs(first = 100) {
  'use cache';
  cacheTag('race');
  cacheLife('days');

  return executeQuery<RaceSlugsQuery, Record<string, unknown>>(RACE_SLUGS, { first });
}
