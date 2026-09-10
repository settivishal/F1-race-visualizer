import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Titillium_Web } from "next/font/google";
import { siteUrl } from "@/lib/site-url";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * Three faces, each with a job.
 *
 * Titillium is the display face because it is the one with motorsport lineage —
 * F1's own wordmark descends from it — and because a condensed-ish grotesque
 * holds up at the sizes the race titles want. `font-heading` has been used in
 * fourteen places across six components since the M2 port; until now it bound
 * nothing, because v1 defined it as a plain CSS class at the bottom of
 * globals.css and only the token block came over.
 *
 * JetBrains Mono carries lap times, gaps and positions. The reason is not
 * style: it has true tabular figures, and timing columns that change every
 * frame reflow without them.
 *
 * `display: "swap"` plus next/font's automatic fallback metrics is what keeps
 * the swap from shifting the layout.
 */
const displayFont = Titillium_Web({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const numericFont = JetBrains_Mono({
  variable: "--font-numeric",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  // Without a base, the generated OG image tags are relative and every crawler
  // that reads them resolves nothing.
  metadataBase: new URL(siteUrl),
  // The suffix used to be typed out at the end of every page's title, which is
  // eleven copies of one string and eleven chances to get it wrong. A template
  // applies it to whatever a child segment sets; `default` is what renders when
  // a segment sets nothing, and Next requires it alongside a template.
  title: {
    default: "RaceLines",
    template: "%s — RaceLines",
  },
  description: "Watch a grand prix unfold as an animated position chart.",
  // Inherited by every route. The race pages add their own image through
  // `races/[slug]/opengraph-image.tsx`; everything else gets the site default.
  openGraph: {
    type: "website",
    siteName: "RaceLines",
    title: "RaceLines",
    description: "Watch a grand prix unfold as an animated position chart.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `suppressHydrationWarning` on <html>: the inline script below adds
  // `light`/`dark` to this element before React hydrates, so the client's
  // className never matches the server's. Doing exactly that is the point of
  // the script — the mismatch warning is the false positive, not the class.
  // It suppresses one level deep, so nothing inside the tree is affected.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${numericFont.variable} h-full antialiased`}
    >
      <head>
        {/* Before the first paint, or a stored light choice renders dark and
            then flips. See lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Deliberately bare. The nav, footer and `<main>` landmark belong to
          the (public) group; /admin renders its own shell. */}
      <body className="min-h-full flex flex-col">
        {children}
        {/* Free on Hobby, and the only traffic data this project will have —
            /admin/runs says whether the ingest worked, not whether anyone
            visited. It ships nothing in development, so a local page view is
            never counted. */}
        <Analytics />
      </body>
    </html>
  );
}
