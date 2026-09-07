import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/ui/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { RecordTable, StatRow } from '@/components/archive/record-table';
import { getArchiveIndex, getDriverProfile } from '@/lib/queries';

/**
 * A driver's record across the seasons in the database.
 *
 * Deliberately not called a career: this covers what has been imported, which
 * is 2018 onward, and the page says so rather than implying a driver who raced
 * before that started here.
 */
export async function generateStaticParams() {
  const { drivers } = await getArchiveIndex();
  return drivers.map((driver) => ({ code: driver.code.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { driver } = await getDriverProfile(code);

  if (!driver) return { title: 'Driver not found — F1 Race Visualizer' };
  return {
    title: `${driver.driver.name} — F1 Race Visualizer`,
    description: `Season-by-season record for ${driver.driver.name}.`,
  };
}

export default function DriverPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <PageContainer>
      <Link
        href="/drivers"
        className="inline-flex rounded-sm text-eyebrow font-semibold uppercase text-muted transition-colors hover:text-foreground"
      >
        ← All drivers
      </Link>

      <Suspense fallback={<ProfileSkeleton />}>
        <DriverDetail params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function DriverDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { driver: profile } = await getDriverProfile(code);

  if (!profile) notFound();

  const { driver, career } = profile;
  const latest = career.seasons[0];

  return (
    <>
      <header className="mt-5">
        <p className="text-eyebrow font-semibold uppercase text-accent">
          {driver.code}
          {driver.number !== null ? ` · #${driver.number}` : ''}
        </p>
        <h1 className="font-heading mt-2.5 text-4xl font-bold tracking-tight sm:text-5xl">
          {driver.name}
        </h1>
        <p className="mt-2.5 text-muted">
          {driver.country ?? 'Nationality unknown'}
          {latest?.team ? ` · ${latest.team.name} in ${latest.season}` : ''}
        </p>
      </header>

      <div className="mt-8">
        <StatRow
          stats={[
            { label: 'Seasons', value: String(career.seasonCount) },
            { label: 'Starts', value: String(career.starts) },
            { label: 'Wins', value: String(career.wins) },
            { label: 'Podiums', value: String(career.podiums) },
            { label: 'Best', value: career.bestFinish === null ? '—' : `P${career.bestFinish}` },
            { label: 'Points', value: String(career.points) },
          ]}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-bold tracking-tight">By season</h2>
        {/* The honest caveat, on the page rather than in a comment: these are
            the seasons this database holds, not a career total. */}
        <p className="mt-2 text-sm text-muted">
          Covering the seasons imported here. Wins and podiums count grands prix, not sprints.
        </p>
        <div className="mt-4">
          <RecordTable
            caption={`${driver.name}'s record by season`}
            rows={career.seasons.map((season) => ({
              season: season.season,
              teamName: season.team?.name ?? null,
              teamColor: season.team?.color ?? null,
              starts: season.starts,
              wins: season.wins,
              podiums: season.podiums,
              points: season.points,
              bestFinish: season.bestFinish ?? null,
            }))}
          />
        </div>
      </section>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mt-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-12 w-80 max-w-full" />
      <Skeleton className="mt-3 h-5 w-56" />
      <Skeleton className="mt-8 h-24 w-full rounded-xl" />
      <Skeleton className="mt-10 h-72 w-full rounded-xl" />
    </div>
  );
}
