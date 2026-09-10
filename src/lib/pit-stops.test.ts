import { describe, expect, it } from 'vitest';
import { isRacingStop } from './pit-stops';

describe('isRacingStop', () => {
  it('separates the two populations the data actually contains', () => {
    // Left of the gap: a normal stop, the slowest ordinary one, and the 155s
    // repair that is the longest genuine stop in the database.
    expect(isRacingStop(23_400)).toBe(true);
    expect(isRacingStop(93_200)).toBe(true);
    expect(isRacingStop(155_100)).toBe(true);

    // Right of it: the shortest suspension on record, and 2026 Monza's.
    expect(isRacingStop(777_700)).toBe(false);
    expect(isRacingStop(1_842_500)).toBe(false);
  });

  it('treats an unknown duration as a racing stop', () => {
    // The Ergast path publishes stops without a duration; calling those
    // suspensions would erase real stops from the archive seasons.
    expect(isRacingStop(null)).toBe(true);
    expect(isRacingStop(undefined)).toBe(true);
  });
});
