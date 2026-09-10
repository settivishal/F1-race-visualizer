import Link from 'next/link';
import { CommandPalette } from './command-palette';
import { ThemeToggle } from './theme-toggle';

const NAV_LINKS = [
  { href: '/races', label: 'Races' },
  { href: '/standings', label: 'Standings' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/teams', label: 'Teams' },
  { href: '/circuits', label: 'Circuits' },
  { href: '/compare', label: 'Compare' },
];

/**
 * The site header.
 *
 * v1's navbar was a client component wired to `AuthProvider` and a profile
 * dropdown. Neither exists yet, and a header does not need to be interactive to
 * render links — so this is a server component and stays one. M3 adds the
 * auth-aware right-hand side. The theme toggle is the one client component in
 * here, an island beside the nav rather than a reason to make the header one.
 */
export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md"
      // Named so the view transition can pin it: a header that slides with the
      // content removes the one fixed point the eye can hold on to.
      style={{ viewTransitionName: 'site-header' }}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-sm"
          aria-label="RaceLines, home"
        >
          {/* The accent bar is the wordmark. A racing stripe reads as the sport
              without needing a logo file or a licence for one. */}
          <span
            aria-hidden
            className="h-5 w-1 rounded-full bg-accent transition-colors group-hover:bg-accent-strong"
          />
          <span className="font-heading text-base font-bold uppercase tracking-[0.14em]">
            Race<span className="text-accent">Lines</span>
          </span>
        </Link>

        {/* The row, from md up. Below that it was 477px of links in a 390px
            viewport — every page on the site scrolled sideways by exactly the
            difference, and it was always this element. */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-panel hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle />

          {/* A <details>, not a client component: a disclosure is what this
              element is for, and it needs no JavaScript, no ARIA of our own and
              no state to be keyboard and screen-reader operable. What it does
              not bring is Escape-to-close or a focus trap, neither of which a
              nav panel needs the way a modal does. */}
          <details className="group relative md:hidden">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md text-muted transition-colors hover:bg-panel hover:text-foreground [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
                className="h-5 w-5"
              >
                {/* Three lines closed, a cross open — the state is the icon. */}
                <path d="M4 7h16M4 12h16M4 17h16" className="group-open:hidden" />
                <path d="M6 6l12 12M18 6L6 18" className="hidden group-open:block" />
              </svg>
            </summary>

            <nav
              aria-label="Main"
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-background shadow-lg"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex min-h-11 items-center border-b border-line/60 px-4 text-sm font-medium text-foreground last:border-0 hover:bg-panel"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
