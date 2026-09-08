import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getArchiveIndex } from '@/lib/queries';

export const metadata = {
  title: 'Drivers — F1 Race Visualizer',
  description: 'Every driver in the archive, with their season-by-season record.',
};

export default function DriversPage() {
  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Archive"
        title="Drivers"
        description="Everyone who has started a race in the seasons imported here."
      />
      <div className="mt-8">
        <Suspense fallback={<GridSkeleton />}>
          <DriverGrid />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function DriverGrid() {
  const { drivers } = await getArchiveIndex();

  if (drivers.length === 0) {
    return <EmptyState title="No drivers yet" description="Import a season and they appear here." />;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
