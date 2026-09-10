import { describe, expect, it } from 'vitest';
import { sessionTitle } from './session-title';

describe('sessionTitle', () => {
  it('names a sprint after its weekend', () => {
    expect(sessionTitle('British Grand Prix', 'SPRINT')).toBe('British Sprint');
    expect(sessionTitle('São Paulo Grand Prix', 'SPRINT')).toBe('São Paulo Sprint');
  });

  it('leaves the grand prix alone', () => {
    expect(sessionTitle('British Grand Prix', 'GRAND_PRIX')).toBe('British Grand Prix');
  });

  it('appends rather than mangles a name that does not end in Grand Prix', () => {
    expect(sessionTitle('Indianapolis 500', 'SPRINT')).toBe('Indianapolis 500 Sprint');
    // Only the trailing words are replaced, so a name carrying the phrase in
    // the middle keeps it.
    expect(sessionTitle('Grand Prix of Miami', 'SPRINT')).toBe('Grand Prix of Miami Sprint');
  });
});
