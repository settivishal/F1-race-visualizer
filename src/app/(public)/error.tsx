'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { PageContainer } from '@/components/ui/page-container';

/**
 * The public error boundary.
 *
 * Every read on these pages goes through a cached GraphQL query against Neon,
 * whose compute autosuspends — so the realistic failure is a cold start timing
 * out or the database being briefly unreachable, and the realistic fix is to
 * try again. Hence `retry()` as the primary action rather than a link home —
 * and `retry()` rather than `reset()`, which re-renders the children without
 * re-fetching them and so cannot fix the failure this boundary catches.
 *
 * `digest` is the only part of the error React exposes to the client; the
 * message and stack stay on the server. Showing it gives a person something to
 * quote from the Vercel logs.
 */
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PageContainer className="py-20">
      <ErrorState
        title="This page did not load"
        message={
          error.digest
            ? `Something failed while fetching the race data. Reference ${error.digest}.`
            : 'Something failed while fetching the race data.'
        }
        action={
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        }
      />
    </PageContainer>
  );
}
