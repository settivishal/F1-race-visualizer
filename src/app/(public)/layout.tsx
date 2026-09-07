import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

/**
 * The public shell: nav, footer, and the `<main>` landmark.
 *
 * A route group rather than a conditional in the root layout, because a server
 * layout cannot read the pathname — and the alternative, a client component
 * that checks `usePathname`, would make the whole shell client-rendered to
 * answer a question the routing already knows. v1 did it that way in
 * `AppShell`; the group is what the App Router offers instead. `(public)` is
 * not part of any URL.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* First in the tab order, visible only once focused. Without it a
          keyboard user walks the whole header on every page. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel-strong focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
