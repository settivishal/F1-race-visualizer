import { describe, expect, it } from 'vitest';
import { inkOn, teamMonogram } from './team-monogram';

describe('teamMonogram', () => {
  it('uses the sport’s own abbreviation where there is one', () => {
    expect(teamMonogram('Red Bull Racing')).toBe('RBR');
    expect(teamMonogram('Haas F1 Team')).toBe('HAA');
    expect(teamMonogram('Racing Bulls')).toBe('RB');
  });

  it('falls back to letters for a team nobody has listed yet', () => {
    // The grid changes: Audi and Cadillac were both new rows once.
    expect(teamMonogram('Something New F1')).toBe('SOM');
    expect(teamMonogram(null)).toBeNull();
    expect(teamMonogram('123')).toBeNull();
  });
});

describe('inkOn', () => {
  it('picks the ink the livery can carry', () => {
    expect(inkOn('#909090')).toBe('#0b0e13'); // Cadillac silver
    expect(inkOn('#6CD3BF')).toBe('#0b0e13'); // Mercedes petronas
    expect(inkOn('#3671C6')).toBe('#ffffff'); // Red Bull navy
    // The 2026 Ferrari livery is bright enough to take black — white on it is
    // 4.3:1, under AA, which is the whole reason this is computed rather than
    // assumed from "red means white text".
    expect(inkOn('#F91536')).toBe('#0b0e13');
  });

  it('defaults to white when the colour is missing or malformed', () => {
    expect(inkOn(null)).toBe('#ffffff');
    expect(inkOn('rebeccapurple')).toBe('#ffffff');
  });
});
