import Link from 'next/link';
import { signOut } from '@/auth';
import { Button } from '@/components/ui/button';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Races' },
  { href: '/admin/runs', label: 'Ingest runs' },
];

/**
 * The admin shell.
 *
 * A separate layout from the public one, which is why the public routes live in
 * a `(public)` group: a server layout cannot read the pathname, so "show the
 * site nav everywhere except /admin" is a routing question, not a render-time
 * one. v1 answered it with a client component checking `usePathname`, which
 * made the whole shell client-rendered.
 *
 * There is no auth check here. `src/proxy.ts` has already redirected anyone
 * without a session before this renders — and a check here would still not be
 * the one that matters, because it would not cover the Server Actions. Those
 * guard themselves; see actions.ts.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  async function endSession() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <>
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-sm">
            <span aria-hidden className="h-5 w-1 rounded-full bg-accent" />
            <span className="font-heading text-sm font-bold uppercase tracking-[0.14em]">
              Admin
            </span>
          </Link>

          <nav aria-label="Admin" className="flex items-center gap-1">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-panel-strong hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/"
              className="rounded-sm text-sm text-muted transition-colors hover:text-foreground"
            >
              View site
            </Link>
            <form action={endSession}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main id="content" className="flex-1">
        {children}
      </main>
    </>
  );
}
