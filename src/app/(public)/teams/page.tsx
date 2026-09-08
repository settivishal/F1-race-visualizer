import { Suspense } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getArchiveIndex } from '@/lib/queries';

export const metadata = {
  title: 'Teams — F1 Race Visualizer',
  description: 'Every constructor in the archive, with their season-by-season record.',
};

export default function TeamsPage() {
  return (
    <PageContainer>
      <SectionHeader
        eyebrow="Archive"
        title="Teams"
        description="Every constructor that has entered a race in the seasons imported here. A team that rebranded appears under each name it raced with, which is how the championship counted it."
      />
      <div className="mt-8">
        <Suspense fallback={<GridSkeleton />}>
          <TeamGrid />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function TeamGrid() {
  const { teams } = await getArchiveIndex();

  if (teams.length === 0) {
    return <EmptyState title="No teams yet" description="Import a season and they appear here." />;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <li key={team.id}>
          <Link href={`/teams/${encodeURIComponent(team.name)}`} className="block rounded-xl">
            <Card interactive className="flex items-center gap-3">
              <span
                className="h-6 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: team.color ?? 'var(--muted)' }}
                aria-hidden
              />
              <span className="font-medium">{team.name}</span>
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
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
