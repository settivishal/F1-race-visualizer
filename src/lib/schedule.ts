/**
 * How long until something, in words.
 *
 * Shared by the season countdown on the home page and the scheduled-race state
 * on a race page, which is the whole reason it is not a private helper of
 * either: two components saying "in 6 days" differently is how a site starts
 * to feel assembled rather than designed.
 *
 * Whole units only, largest first: "in 6 days", "in 4 hours", "in 12 minutes".
 * A race is scheduled to the minute and nobody reads seconds off a landing
 * page, so the smallest unit is the minute and "starting now" covers the hour
 * either side of a green light rather than counting down to zero and stopping.
 */
export function untilLabel(date: string, now: number): string {
  const minutes = Math.floor((Date.parse(date) - now) / 60_000);
  if (minutes < 1) return 'Starting now';

  const days = Math.floor(minutes / 1440);
  if (days >= 1) return `in ${days} ${plural(days, 'day')}`;

  const hours = Math.floor(minutes / 60);
  if (hours >= 1) return `in ${hours} ${plural(hours, 'hour')}`;

  return `in ${minutes} ${plural(minutes, 'minute')}`;
}

const plural = (n: number, unit: string) => (n === 1 ? unit : `${unit}s`);
