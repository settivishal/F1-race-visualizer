import { describe, expect, it } from 'vitest';
import { formatDriverName } from './format-name';

describe('formatDriverName', () => {
  it('unshouts the surname OpenF1 sends', () => {
    expect(formatDriverName('Kimi ANTONELLI')).toBe('Kimi Antonelli');
    expect(formatDriverName('Max VERSTAPPEN')).toBe('Max Verstappen');
    expect(formatDriverName('Nico HULKENBERG')).toBe('Nico Hulkenberg');
  });

  it('leaves a name that is already right completely alone', () => {
    // Both of these are in the database today, from the Ergast archive. A rule
    // that "fixes" them would be losing information, not adding it.
    expect(formatDriverName('Kimi Räikkönen')).toBe('Kimi Räikkönen');
    expect(formatDriverName('Antonio Giovinazzi')).toBe('Antonio Giovinazzi');
    expect(formatDriverName('Sebastian Vettel')).toBe('Sebastian Vettel');
  });

  it('handles a surname written first', () => {
    // OpenF1 sends "ZHOU Guanyu" — family name leading, Chinese order. Casing
    // the shouted token is right whichever end of the name it sits at, and the
    // order is upstream's to decide, not ours to reorder.
    expect(formatDriverName('ZHOU Guanyu')).toBe('Zhou Guanyu');
  });

  it('keeps particles lowercase inside a surname', () => {
    expect(formatDriverName('Giedo VAN DER GARDE')).toBe('Giedo van der Garde');
    expect(formatDriverName('Rodolfo GONZALEZ')).toBe('Rodolfo Gonzalez');
  });

  it('capitalises after a hyphen or an apostrophe', () => {
    expect(formatDriverName('Jean-Eric VERGNE')).toBe('Jean-Eric Vergne');
    expect(formatDriverName('Pato O’WARD')).toBe('Pato O’Ward');
    expect(formatDriverName("Pato O'WARD")).toBe("Pato O'Ward");
  });

  it('leaves an accented shout cased correctly', () => {
    expect(formatDriverName('Sergio PÉREZ')).toBe('Sergio Pérez');
  });

  it('does not mangle initials or a name that is only a particle', () => {
    // A two-letter shout that is a real surname must not become a particle.
    expect(formatDriverName('DE Vries')).toBe('de Vries');
    expect(formatDriverName('Nyck DE VRIES')).toBe('Nyck de Vries');
  });
});
