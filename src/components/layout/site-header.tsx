import Link from 'next/link';

const NAV_LINKS = [
  { href: '/races', label: 'Races' },
];

/**
 * The site header.
 *
 * v1's navbar was a client component wired to `AuthProvider` and a profile
 * dropdown. Neither exists yet, and a header does not need to be interactive to
 * render links — so this is a server component and stays one. M3 adds the
 * auth-aware right-hand side; M4 adds the theme toggle. Both slot in beside
 * the nav without changing what is here.
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
      </div>
    </header>
  );
}
