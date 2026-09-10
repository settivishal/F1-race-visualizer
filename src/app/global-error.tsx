'use client';

/**
 * The boundary of last resort.
 *
 * `(public)/error.tsx` and `admin/error.tsx` wrap the pages below them, but
 * neither wraps the root layout — so a throw in `layout.tsx`, `sitemap.ts`,
 * `robots.ts` or `not-found.tsx` had nothing to catch it and rendered Next's
 * built-in 500 page.
 *
 * This file replaces the root layout when it renders, which is why it declares
 * its own `<html>` and `<body>` and why it cannot reuse `ErrorState`,
 * `PageContainer` or the fonts: the layout that loads `globals.css` is the
 * thing that just failed, so no token, no utility class and no font is
 * guaranteed to have reached the document. Everything here is inline and
 * self-contained on purpose — a styleless error page is still an error page, a
 * broken one is a second bug on top of the first.
 *
 * `metadata` is not supported in a client component, so the title is React's
 * `<title>` element instead.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          // No token here: `globals.css` sets `color-scheme` and every colour
          // variable, and it is not guaranteed to be applied at this point.
          background: '#0b0b0f',
          color: '#f4f4f5',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <title>Something went wrong — RaceLines</title>
        <div role="alert" style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            The site failed to load
          </h1>
          <p style={{ margin: '0.75rem 0 0', lineHeight: 1.6, opacity: 0.85 }}>
            {error.digest
              ? `Something failed before the page could render. Reference ${error.digest}.`
              : 'Something failed before the page could render.'}
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={retry}
              style={{
                minHeight: '2.75rem',
                padding: '0 1.25rem',
                borderRadius: '0.375rem',
                border: '1px solid #3f3f46',
                background: '#18181b',
                color: 'inherit',
                font: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* A plain anchor on purpose: the root layout is what failed, so a
                client-side <Link /> navigation would re-mount the same broken
                tree. This needs a full document load. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '2.75rem',
                padding: '0 1.25rem',
                borderRadius: '0.375rem',
                color: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
