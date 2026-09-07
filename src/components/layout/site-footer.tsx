import Link from 'next/link';

/**
 * The site footer.
 *
 * The attribution line is the point of it. Race data comes from OpenF1, and
 * saying so is both the courteous thing and the accurate one — this is not
 * official Formula 1 data and the footer should not let anyone assume it is.
 * M4 adds the image attribution for Wikipedia headshots on `/about`.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Race data from{' '}
          <a
            href="https://openf1.org"
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-sm font-medium text-foreground underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
          >
            OpenF1
          </a>
          . Unofficial, and not associated with Formula 1.
        </p>
        <Link
          href="/races"
          className="rounded-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Browse races
        </Link>
      </div>
    </footer>
  );
}
