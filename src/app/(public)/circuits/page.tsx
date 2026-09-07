import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getArchiveIndex } from '@/lib/queries';

export const metadata = {
  title: 'Circuits — F1 Race Visualizer',
  description: 'Every circuit that has held a race in the archive.',
};

export default function CircuitsPage() {
  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Archive"
        title="Circuits"
        description="Every circuit that has held one of the races imported here — including the ones the current calendar has left behind."
      />
      <div className="mt-8">
        <Suspense fallback={<GridSkeleton />}>
          <CircuitGrid />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function CircuitGrid() {
  const { circuits } = await getArchiveIndex();

  if (circuits.length === 0) {
    return (
      <EmptyState
        title="No circuits yet"
        description="Circuits arrive with the archive import — OpenF1 publishes a name, not a place."
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
