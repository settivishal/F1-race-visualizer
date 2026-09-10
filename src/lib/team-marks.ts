/**
 * Team marks, and the licence each one is shown under.
 *
 * Empty on purpose. `docs/decisions.md` ("Reversal: images are not mirrored into
 * Vercel Blob") says the site republishes no image it does not have a licence
 * for, and names the one thing that would change it: Wikimedia's CC BY-SA team
 * logos, attributed the way /about already attributes its data. This is that
 * mechanism, with no asset taken on trust — a team shows a mark only once a file
 * and its licence are written down here.
 *
 * To add one:
 *
 *   1. Put the file at `public/teams/<file>.svg`.
 *   2. Add an entry below, keyed by the team name exactly as `teams.name` stores
 *      it — the same string the standings render.
 *   3. Nothing else. /about lists whatever is here, and the season strip picks it
 *      up on the next build.
 *
 * A team with no entry keeps the plain colour block it has today, so the strip
 * is never half-marked in a way that reads as a broken image.
 */
export type TeamMark = {
  /** Path under `public/`, e.g. `/teams/ferrari.svg`. */
  src: string;
  /** Where the file came from, so the attribution can link it. */
  source: string;
  /** The licence it is offered under, e.g. `CC BY-SA 4.0`. */
  licence: string;
  /** Who to credit, where the licence asks for it. */
  author?: string;
};

export const TEAM_MARKS: Record<string, TeamMark> = {};

export const markFor = (teamName: string | null | undefined): TeamMark | null =>
  (teamName && TEAM_MARKS[teamName]) || null;

/** Every distinct source and licence in use, for the attribution on /about. */
export const markAttributions = (): TeamMark[] => Object.values(TEAM_MARKS);
