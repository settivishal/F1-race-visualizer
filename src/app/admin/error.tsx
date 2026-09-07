'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

/**
 * The admin error boundary. Separate from the public one because /admin renders
 * its own shell — and because the failure here is usually a mutation or an
 * OpenF1 call, where the reference is the thing worth showing: it is what ties
 * a screen to a row in `ingest_runs` and a line in the Vercel log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <ErrorState
        title="Admin action failed"
        message={
          error.digest
            ? `The request did not complete. Reference ${error.digest}.`
            : 'The request did not complete.'
        }
        action={
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
