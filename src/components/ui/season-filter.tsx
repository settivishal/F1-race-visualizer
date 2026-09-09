import Link from 'next/link';

/**
 * A row of years, as links.
 *
 * Links rather than a select with a submit button: a year is a destination, it
 * applies on click, it needs no JavaScript for what an anchor does, and each
 * season is a URL that can be sent to someone. The race library proved the
 * shape; the archive index pages had no filter at all and listed everything
 * ever imported — eighteen constructors for a ten-team grid.
 *
 * `?season=all` is explicit because the default is the current season rather
 * than everything.
 */
export function SeasonFilter({
  pathname,
  seasons,
  active,
  extra = {},
}: {
  pathname: string;
  seasons: number[];
  /** null means "all seasons". */
  active: number | null;
  /** Other query parameters to preserve, such as a search term. */
  extra?: Record<string, string>;
}) {
  const chip = (label: string, value: string, isActive: boolean) => (
    <Link
      key={value}
      href={{ pathname, query: { season: value, ...extra } }}
      aria-current={isActive ? 'page' : undefined}
      className={`tap tabular inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        isActive
          ? 'bg-accent-fill text-on-accent'
          : 'border border-line text-muted hover:border-line-strong hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Season" className="flex flex-wrap gap-1.5">
      {[...seasons]
        .sort((a, b) => b - a)
        .map((year) => chip(String(year), String(year), active === year))}
      {chip('All seasons', 'all', active === null)}
    </nav>
  );
}
