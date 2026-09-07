import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer } from '@/components/ui/page-container';

/**
 * The 404. Lives at the app root rather than in the (public) group because a
 * bad URL matches no group — a route that does not exist has no layout to
 * render inside, so a not-found page in the group would never be reached.
 *
 * `notFound()` in the race page lands here too, which is the common case: a
 * slug that was never ingested. That one answers 200 rather than 404: the check
 * runs inside the Suspense boundary, so the response has already started
 * streaming and the status can no longer change. Next injects
 * `<meta name="robots" content="noindex">` for exactly this case, which keeps
 * the soft 404 out of search. A real 404 would mean checking the slug in
 * `proxy.ts` — a database lookup on every request to save a status code.
 */
export default function NotFound() {
  return (
    <PageContainer className="py-20">
      <EmptyState
        title="Page not found"
        description="That race or page does not exist. It may never have been imported."
        action={
          <Link href="/races">
            <Button variant="secondary" size="sm">
              Browse races
            </Button>
          </Link>
        }
      />
    </PageContainer>
  );
}
