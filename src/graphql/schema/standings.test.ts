import { describe, expect, it } from 'vitest';
import { countback } from './standings';

/**
 * The comparator only, because the tie it settles cannot be reached through a
 * seeded query without a second race, and a second race is what the pagination
 * fixtures assume there is not.
 */
describe('countback', () => {
  it('separates entrants that are level on wins and podiums', () => {
    // 2025's real ties: no wins, no podiums, so wins-then-podiums cannot rank
    // these — the better fourth place does.
    expect(countback([4, 10], [5, 5])).toBeLessThan(0);
    expect(countback([5, 5], [4, 10])).toBeGreaterThan(0);
  });

  it('prefers a win over any number of lesser finishes', () => {
    expect(countback([1, 20], [2, 2, 2])).toBeLessThan(0);
  });

  it('reports no order when the finishes are identical', () => {
    expect(countback([3, 7], [7, 3])).toBe(0);
  });
});
