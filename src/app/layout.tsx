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
  title: "F1 Race Visualizer",
  description: "Watch a grand prix unfold as an animated position chart.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${numericFont.variable} h-full antialiased`}
    >
      <head>
        {/* Before the first paint, or a stored light choice renders dark and
            then flips. See lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Deliberately bare. The nav, footer and `<main>` landmark belong to
          the (public) group; /admin renders its own shell. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
