import { describe, expect, it } from 'vitest';
import { isTitleSettled, pointsStillAvailable } from './championship';

describe('pointsStillAvailable', () => {
  it('counts a win and a sprint win, and nothing else', () => {
    expect(pointsStillAvailable({ grandsPrix: 4, sprints: 2 })).toBe(4 * 25 + 2 * 8);
    expect(pointsStillAvailable({ grandsPrix: 0, sprints: 0 })).toBe(0);
  });
});

describe('isTitleSettled', () => {
  it('is not settled while the gap is reachable', () => {
    // Two rounds left, one with a sprint: 58 points on the table.
    const remaining = { grandsPrix: 2, sprints: 1 };
    expect(isTitleSettled(57, remaining)).toBe(false);
    expect(isTitleSettled(59, remaining)).toBe(true);
  });

  it('treats an exactly-equal gap as still live, because a tie is not a win', () => {
    // The challenger can draw level, and the standings break a tie by
    // countback rather than by leaving the leader in front.
    expect(isTitleSettled(25, { grandsPrix: 1, sprints: 0 })).toBe(false);
  });

  it('settles once nothing is left to score', () => {
    expect(isTitleSettled(1, { grandsPrix: 0, sprints: 0 })).toBe(true);
    // A dead heat at the end of the season is still not "settled" by points.
    expect(isTitleSettled(0, { grandsPrix: 0, sprints: 0 })).toBe(false);
  });
});
