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
 * slug that was never ingested. That one answered 200 for a while, because the
 * check ran inside the Suspense boundary and the response had already started
 * streaming. It now answers 404 — the existence check is hoisted into the page
 * component, above the boundary, and costs a cache read rather than a query.
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
