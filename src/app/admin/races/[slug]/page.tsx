import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm } from '@/components/admin/action-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/ui/page-container';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { executeAsAdmin } from '@/graphql/execute';
import type { AdminRaceQuery } from '@/graphql/generated/graphql';
import { updateMetadataAction } from '../../actions';

export const metadata = {
  title: 'Edit race — Admin',
  robots: { index: false, follow: false },
};

/**
 * Correcting what an import got wrong.
 *
 * Only the human-facing fields. Lap counts and names come from OpenF1 and are
 * occasionally odd; positions, results and events do not get hand-edited,
 * because a value typed here would be silently overwritten by the next import
 * of the same session — and an edit that disappears is worse than no edit.
 * `laps` and the meeting names survive because nothing in `transform.ts`
 * rewrites them on a re-import.
 */
export default function EditRacePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageContainer className="max-w-2xl">
      <Link
        href="/admin"
        className="inline-flex rounded-sm text-eyebrow font-semibold uppercase text-muted transition-colors hover:text-foreground"
      >
        ← All races
      </Link>
      <Suspense fallback={<Skeleton className="mt-6 h-[30rem] w-full rounded-xl" />}>
        <EditForm params={params} />
      </Suspense>
    </PageContainer>
  );
}

async function EditForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { race } = await executeAsAdmin<AdminRaceQuery, { slug: string }>(ADMIN_RACE, { slug });

  if (!race) notFound();

  return (
    <div className="mt-5">
      <SectionHeader
        title={race.meeting?.name ?? race.slug}
        description={`${race.slug} · ${race.type === 'SPRINT' ? 'Sprint' : 'Grand Prix'}`}
      />

      <Card className="mt-8">
        <ActionForm action={updateMetadataAction} className="space-y-4">
          <input type="hidden" name="slug" value={race.slug} />

          <Input
            label="Meeting name"
            name="name"
            defaultValue={race.meeting?.name ?? ''}
            hint="What every page shows as the title of the weekend."
          />
          <Input label="Country" name="country" defaultValue={race.meeting?.country ?? ''} />
          <Input
            label="Circuit name"
            name="circuitName"
            defaultValue={race.meeting?.circuitName ?? ''}
            hint="Leave empty to clear it — this is the one field that may be blank."
          />
          <Input
            label="Laps"
            name="laps"
            inputMode="numeric"
            defaultValue={String(race.laps)}
            hint="The scheduled distance. The replay derives its own lap list from the data."
          />

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit">Save</Button>
            <Link href={`/races/${race.slug}`} target="_blank" rel="noreferrer">
              <Button type="button" variant="ghost">
                View public page
              </Button>
            </Link>
          </div>
        </ActionForm>
      </Card>

      <p className="mt-4 text-sm text-muted">
        {race.openf1SessionKey
          ? `OpenF1 session ${race.openf1SessionKey}. Re-importing overwrites positions, results and events, but not these fields.`
          : 'No OpenF1 session key, so this race cannot be re-imported.'}
      </p>
    </div>
  );
}

const ADMIN_RACE = /* GraphQL */ `
  query AdminRace($slug: String!) {
    race(slug: $slug) {
      id slug laps type isFeatured openf1SessionKey
      meeting { name country circuitName round season }
    }
  }
`;
