import Link from 'next/link';
import { markAttributions } from '@/lib/team-marks';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';

export const metadata = {
  title: 'About',
  description:
    'Where the data comes from, how a race replay is built, and what this site is not.',
};

/**
 * The credits page. Static — no query, no season, nothing to stream — so it is
 * an ordinary server component and prerenders whole.
 *
 * It exists for the attribution, which is the part with an obligation attached:
 * OpenF1 supplies every timing row on the site, and saying so plainly is both
 * the courteous thing and the accurate one. The disclaimer is here for the same
 * reason it is in the footer — nobody should be able to mistake this for an
 * official Formula 1 product.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 max-w-2xl">
      <h2 className="type-card-title text-foreground">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-base leading-7 text-muted">{children}</div>
    </section>
  );
}

const linkClasses =
  'rounded-sm font-medium text-foreground underline decoration-line underline-offset-4 transition-colors hover:decoration-accent';

export default function AboutPage() {
  const marks = markAttributions();

  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Colophon"
        title="About"
        description="An animated position chart for a grand prix, built from public timing data."
      />

      <Section title="What it does">
        <p>
          Every race here replays lap by lap: each driver is a line on the position chart,
          the timing tower beside it carries the same order as text, and race control events
          land on the lap they happened. The classification, the championship tables and the
          replay all come from one set of results — nothing on the site is a stored ranking
          that could drift from the laps it claims to summarise.
        </p>
      </Section>

      <Section title="Where the data comes from">
        <p>
          Timing, results and driver information are ingested from{' '}
          <a href="https://openf1.org" target="_blank" rel="noreferrer noopener" className={linkClasses}>
            OpenF1
          </a>
          , an open API for Formula 1 session data, and stored in this site&rsquo;s own
          database so a replay does not depend on a live third-party call. Standings are
          derived from those results rather than imported.
        </p>
        <p>
          Driver headshot URLs arrive with the OpenF1 driver records and point at Formula
          1&rsquo;s own media servers. They are stored but not displayed anywhere on the
          site: those images are not offered under a licence that would let this project
          republish them, and no driver photograph is served from these pages.
        </p>
        <p>
          Team colours are the season liveries, and the flag colours are the sport&rsquo;s
          own signals — yellow means yellow in either theme.
        </p>
        {/* Written from the manifest rather than by hand, so a mark cannot be
            added to the site without its credit appearing here. Nothing renders
            while no team has one. */}
        {marks.length > 0 ? (
          <p>
            Team marks shown beside the season are used under their own licences:{' '}
            {marks.map((mark, index) => (
              <span key={mark.src}>
                {index > 0 ? '; ' : ''}
                <a
                  href={mark.source}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={linkClasses}
                >
                  {mark.src.split('/').pop()?.replace(/\.svg$/, '')}
                </a>{' '}
                — {mark.licence}
                {mark.author ? `, ${mark.author}` : ''}
              </span>
            ))}
            .
          </p>
        ) : null}
      </Section>

      <Section title="How it is built">
        <p>
          Next.js and TypeScript on Vercel, Postgres on Neon, and a GraphQL layer in between
          that every page reads through. The replay is an SVG chart driven by React state
          rather than a charting library, which is what keeps 20 cars over 70 laps smooth.
          A scheduled job ingests new sessions and re-imports corrected ones.
        </p>
      </Section>

      <Section title="What this is not">
        <p>
          Unofficial and unaffiliated. This site is not associated with Formula 1, the FIA,
          or any team, and carries no endorsement from them. F1, FORMULA ONE and GRAND PRIX
          are trademarks of Formula One Licensing BV and are used here only to describe the
          races the data covers.
        </p>
        <p>
          Timing data can be incomplete — a session occasionally arrives missing laps, and
          the replay shows the laps that exist rather than inventing the ones that do not.
        </p>
      </Section>

      <Section title="Elsewhere">
        <p>
          <Link href="/races" className={linkClasses}>
            Browse the races
          </Link>{' '}
          or{' '}
          <Link href="/standings" className={linkClasses}>
            read the championship tables
          </Link>
          .
        </p>
      </Section>
    </PageContainer>
  );
}
