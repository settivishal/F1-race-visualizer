'use client';

import { useActionState } from 'react';
import type { ReactNode } from 'react';
import type { ActionResult } from '@/app/admin/actions';
import { cn } from '@/lib/cn';

/**
 * A form that reports what its Server Action did, and says while it is doing it.
 *
 * The pending state is the point as much as the message: an import is several
 * seconds of OpenF1 requests, and a button that looks idle through all of it
 * invites a second click — which would start a second import of the same
 * session. Disabling the fieldset is what stops that.
 *
 * The only client component in the admin. Everything else is a server
 * component; this exists because `useActionState` has no server equivalent, and
 * a plain `<form action>` can only return void.
 */
export function ActionForm({
  action,
  children,
  className,
  showResult = true,
}: {
  action: (previous: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  /** Off for rows in a list, where a message under every button is noise. */
  showResult?: boolean;
}) {
  const [result, formAction, isPending] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {/* Disabling the set rather than the button also stops a second submit
          via Enter from inside a text field. */}
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>

      {isPending ? (
        <p role="status" className="mt-2 text-sm text-muted">
          Working…
        </p>
      ) : null}

      {showResult && result && !isPending ? (
        <p
          role="status"
          className={cn('mt-2 text-sm', result.ok ? 'text-flag-green' : 'text-flag-red')}
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
