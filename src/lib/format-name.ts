/**
 * Driver names, as a person would write them.
 *
 * OpenF1 publishes `full_name` with the surname shouted — "Kimi ANTONELLI" —
 * while Ergast publishes "Kimi Antonelli". The driver row holds one name and
 * the ingest assigns it, so which one the site showed depended on which import
 * ran last. Normalising both to the same shape settles that as a side effect.
 *
 * Only ALL-CAPS tokens are touched. Everything else is left exactly as it
 * arrived, which is what keeps "Kimi Räikkönen" and "Antonio Giovinazzi" — both
 * already correct in the database — from being "corrected" into something else.
 * A name is the one field where guessing is worse than doing nothing.
 */

/**
 * Particles that stay lowercase inside a surname. Only applied to a token that
 * arrived shouting, so a source that already wrote "Van Amersfoort" keeps it.
 */
const PARTICLES = new Set([
  'van', 'von', 'der', 'den', 'de', 'del', 'della', 'di', 'da', 'dos', 'du',
  'la', 'le', 'el', 'bin', 'al',
]);

/** Capitalise after a space, a hyphen or an apostrophe: "o'ward" -> "O'Ward". */
const capitalise = (word: string) =>
  word.replace(/(^|[-'’])(\p{L})/gu, (_match, boundary: string, letter: string) =>
    boundary + letter.toUpperCase(),
  );

const isShouted = (token: string) =>
  token.length > 1 && token === token.toUpperCase() && token !== token.toLowerCase();

export function formatDriverName(name: string): string {
  return name
    .split(' ')
    .map((token) => {
      if (!isShouted(token)) return token;

      const lower = token.toLowerCase();
      // A particle is only a particle between other words. "DE" as the whole
      // name is somebody's surname.
      return PARTICLES.has(lower) ? lower : capitalise(lower);
    })
    .join(' ');
}
