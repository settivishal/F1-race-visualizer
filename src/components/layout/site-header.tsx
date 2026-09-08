import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

const NAV_LINKS = [
  { href: '/races', label: 'Races' },
  { href: '/standings', label: 'Standings' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/teams', label: 'Teams' },
  { href: '/circuits', label: 'Circuits' },
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
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-sm"
          aria-label="F1 Race Visualizer, home"
        >
          {/* The accent bar is the wordmark. A racing stripe reads as the sport
              without needing a logo file or a licence for one. */}
          <span
            aria-hidden
            className="h-5 w-1 rounded-full bg-accent transition-colors group-hover:bg-accent-strong"
          />
          <span className="font-heading text-base font-bold uppercase tracking-[0.14em]">
            Race<span className="text-accent">viz</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
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

        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
