import Link from 'next/link';

/**
 * The site footer.
 *
 * The attribution line is the point of it. Race data comes from OpenF1, and
 * saying so is both the courteous thing and the accurate one — this is not
 * official Formula 1 data and the footer should not let anyone assume it is.
 * The full attribution, including why no driver photograph is served, lives on
 * `/about`; this line is the short form that appears on every page.
 *
 * The 2c wireframe asked for the wordmark and a row of links alongside it. Both
 * are here rather than on the landing page alone: a footer that changes shape
 * per route is a footer nobody learns.
 */

/** A subset of the header's nav, plus About. The footer is a way back, not a
 *  second navigation — Circuits and Compare stay in the header. */
const FOOTER_LINKS = [
  { href: '/races', label: 'Races' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/teams', label: 'Teams' },
  { href: '/standings', label: 'Standings' },
  { href: '/about', label: 'About' },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 text-sm text-muted lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <Link href="/" className="group flex items-center gap-2.5 rounded-sm" aria-label="F1 Race Visualizer, home">
          {/* The same racing stripe the header uses — the mark is a stripe and a
              word, so it costs no logo file and no licence for one. */}
          <span
            aria-hidden
            className="h-5 w-1 rounded-full bg-accent transition-colors group-hover:bg-accent-strong"
          />
          <span className="font-heading text-base font-bold uppercase tracking-[0.14em] text-foreground">
            Race<span className="text-accent">viz</span>
          </span>
        </Link>

        {/* Standalone links rather than links in a sentence, so the WCAG
            exception for inline text does not apply and they need a real box.
            They were 20px tall — the height of their own text. */}
        {/* -mx-2 so the links' own padding does not push them in from the
            page edge on a phone, where they sit under the attribution rather
            than beside it. */}
        <nav aria-label="Footer" className="-mx-2 flex flex-wrap items-center gap-1 sm:gap-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="tap inline-flex items-center rounded-md px-2 py-1.5 font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="max-w-prose leading-6 lg:text-right">
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
      </div>
    </footer>
  );
}
