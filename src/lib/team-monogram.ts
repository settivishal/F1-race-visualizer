/**
 * A team's short code, and an ink that reads on its livery.
 *
 * The season strip used to be colour alone, which says how a season went but not
 * who won a given round. Team logos were the obvious answer and turn out not to
 * be available: roughly half the current grid's marks are figurative and
 * copyrighted — Ferrari's horse is not on Wikimedia Commons at all, only
 * photographs of it — so a logo set would have covered some teams and not
 * others. See docs/decisions.md.
 *
 * A monogram needs no licence, covers every team including ones that do not
 * exist yet, and is the abbreviation the sport already uses on a timing screen.
 */
const CODES: Record<string, string> = {
  Alpine: 'ALP',
  'Aston Martin': 'AST',
  Audi: 'AUD',
  Cadillac: 'CAD',
  Ferrari: 'FER',
  'Haas F1 Team': 'HAA',
  McLaren: 'MCL',
  Mercedes: 'MER',
  'Racing Bulls': 'RB',
  'Red Bull Racing': 'RBR',
  Williams: 'WIL',
  // Teams the archive holds that are no longer on the grid.
  'Alfa Romeo': 'ALF',
  AlphaTauri: 'ATA',
  'Kick Sauber': 'SAU',
  Sauber: 'SAU',
  'Toro Rosso': 'STR',
  'Force India': 'FI',
  'Racing Point': 'RP',
  Renault: 'REN',
  'RB F1 Team': 'RB',
};

/**
 * Falls back to the first three letters rather than to nothing: a team this list
 * has never heard of is a team the ingest just invented, and "STA" beside a
 * green square is still more than a green square.
 */
export function teamMonogram(teamName: string | null | undefined): string | null {
  if (!teamName) return null;
  const known = CODES[teamName];
  if (known) return known;
  const letters = teamName.replace(/[^A-Za-z]/g, '');
  return letters ? letters.slice(0, 3).toUpperCase() : null;
}

/**
 * Black or white, whichever the livery can carry.
 *
 * Relative luminance per WCAG, then the same threshold the contrast ratio gives:
 * above it, black on the colour beats white, and below it the reverse. Written
 * out rather than reached for from a package — it is six lines and the palette
 * it serves is eleven hex strings from the database.
 */
export function inkOn(hex: string | null | undefined): string {
  const parsed = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!parsed) return '#ffffff';
  const value = parseInt(parsed[1], 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel((value >> 16) & 0xff) +
    0.7152 * channel((value >> 8) & 0xff) +
    0.0722 * channel(value & 0xff);
  // 0.179 is where white and black give the same contrast ratio against a
  // colour; every F1 livery from silver to navy lands cleanly on one side.
  return luminance > 0.179 ? '#0b0e13' : '#ffffff';
}
