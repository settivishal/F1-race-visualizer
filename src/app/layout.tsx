import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Titillium_Web } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
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
      <body className="min-h-full flex flex-col">
        {/* First thing in the tab order, visible only once focused. Without it
            a keyboard user walks the whole header on every page. */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel-strong focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
        >
          Skip to content
        </a>
        <SiteHeader />
        {/* The landmark lived only on the home page before this; /races and the
            race detail page rendered their content in bare divs. */}
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
