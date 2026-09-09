import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveSeason, getArchiveIndex } from '@/lib/queries';

export const metadata = {
  title: 'Circuits',
  description: 'Every circuit that has held a race in the archive.',
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function CircuitsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Archive"
        title="Circuits"
        description="Every circuit that has held one of the races imported here — including the ones the current calendar has left behind."
      />
      <div className="mt-8">
        <Suspense fallback={<GridSkeleton />}>
          <CircuitGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function CircuitGrid({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = Array.isArray(params.season) ? params.season[0] : params.season;
  const parsed = raw ? Number(raw) : NaN;
  const season = raw === 'all'
    ? null
    : Number.isInteger(parsed)
      ? parsed
      : await getActiveSeason();

  const { circuits } = await getArchiveIndex(season);

  if (circuits.length === 0) {
    return (
      <>
        <div className="mt-6">
          <EmptyState
            title={season === null ? 'Nothing imported yet' : `No circuits in ${season}`}
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
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {circuits.map((circuit) => (
        <li key={circuit.id}>
          <Link href={`/circuits/${circuit.ergastId}`} className="block rounded-xl">
            <Card interactive>
              <p className="font-medium">{circuit.name}</p>
              <p className="mt-1 text-sm text-muted">
                {[circuit.locality, circuit.country].filter(Boolean).join(', ') || '—'}
              </p>
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
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
