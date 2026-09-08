import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { SeasonFilter } from '@/components/ui/season-filter';
import { getActiveSeason, getArchiveIndex } from '@/lib/queries';

export const metadata = {
  title: 'Drivers — F1 Race Visualizer',
  description: 'Every driver in the archive, with their season-by-season record.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function DriversPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Archive"
        title="Drivers"
        description="Everyone who has started a race in the seasons imported here."
      />
      <div className="mt-8">
        <Suspense fallback={<GridSkeleton />}>
          <DriverGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function DriverGrid({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.season) ? params.season[0] : params.season;
  const parsed = raw ? Number(raw) : NaN;
  const season = raw === 'all'
    ? null
    : Number.isInteger(parsed)
      ? parsed
      : await getActiveSeason();

  const { drivers, seasons } = await getArchiveIndex(season);

  const filter = (
    <SeasonFilter pathname="/drivers" seasons={seasons.map((entry) => entry.year)} active={season} />
  );

  if (drivers.length === 0) {
    return (
      <>
        {filter}
        <div className="mt-6">
          <EmptyState
            title={season === null ? 'Nothing imported yet' : `No drivers in ${season}`}
            description={
              season === null
                ? 'Import a season and they appear here.'
                : 'That season has not been imported, or nothing has been matched to it yet.'
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {filter}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {drivers.map((driver) => (
        <li key={driver.id}>
          <Link href={`/drivers/${driver.code.toLowerCase()}`} className="block rounded-xl">
            <Card interactive className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-muted">{driver.code}</span>
              <span className="font-medium">{driver.name}</span>
              {driver.country ? (
                <span className="ml-auto text-xs text-subtle">{driver.country}</span>
              ) : null}
            </Card>
          </Link>
        </li>
      ))}
    </ul>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
