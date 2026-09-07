'use server';

import { updateTag } from 'next/cache';
import { auth } from '@/auth';
import { executeAsAdmin } from '@/graphql/execute';
import type {
  SetRaceFeaturedMutation,
  TriggerIngestMutation,
  UpdateRaceMetadataMutation,
} from '@/graphql/generated/graphql';

/**
 * Every write the admin can perform.
 *
 * **Each function calls `requireAdmin` as its first statement, and that is not
 * decoration.** An exported Server Action is reachable by direct POST whether
 * or not anything imports it, and a page-level check does not extend to the
 * actions defined beneath it — Next's own data-security guide says so in those
 * words. The proxy guards navigation to `/admin`; it does not guard this.
 *
 * The failure mode is what makes it worth stating: an action missing its check
 * behaves correctly through the UI forever, because the UI only ever reaches it
 * from a page the proxy already guarded. Nothing surfaces the gap.
 *
 * See docs/decisions.md, "Three guard layers, not two".
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
}

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | null;

/**
 * Each action takes the previous result as its first argument because that is
 * `useActionState`'s shape — the form needs the outcome back to report it, and
 * a plain `<form action>` can only return void. `ActionForm` is the client
 * wrapper that consumes it.
 */

/**
 * Cache invalidation lives here rather than in the resolvers.
 *
 * It needs a request context, so it can only run in a Server Function or a
 * Route Handler. A resolver reaching into Next's caching would also be the
 * wrong direction of dependency — and the same resolvers run from the cron
 * route and from `scripts/backfill.ts`, neither of which is a place this call
 * would work.
 *
 * `updateTag`, not `revalidateTag`. The two differ in who waits. `updateTag`
 * expires the entry outright, so the next request blocks until fresh data is
 * ready — read-your-own-writes, which is what an admin who just triggered an
 * import needs: seeing the old page after a successful import reads as a
 * failure. `revalidateTag` serves stale content while refreshing in the
 * background, which is the right trade for the cron in PR 3, where nobody is
 * waiting on the result. It is also Server-Action-only, which is why the cron
 * route cannot use it.
 *
 * Always last, and only after the write has succeeded. If it ran first and the
 * write then failed, the cache would be dropped and not replaced: the next
 * visitor takes a miss, re-renders from unchanged data, and the site has lost a
 * page that was working. A failure must leave things exactly as they were.
 */
function invalidateRaces() {
  updateTag('race');
  updateTag('standings');
}

export async function setFeaturedAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const slug = String(formData.get('slug') ?? '');
  const featured = formData.get('featured') === 'true';
  if (!slug) return { ok: false, message: 'No race given.' };

  try {
    await executeAsAdmin<SetRaceFeaturedMutation, { slug: string; featured: boolean }>(
      SET_FEATURED,
      { slug, featured },
    );
  } catch (error) {
    return { ok: false, message: messageOf(error) };
  }

  invalidateRaces();
  return {
    ok: true,
    message: featured ? `${slug} is now featured.` : `${slug} is no longer featured.`,
  };
}

export async function updateMetadataAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const slug = String(formData.get('slug') ?? '');
  if (!slug) return { ok: false, message: 'No race given.' };

  const rawLaps = String(formData.get('laps') ?? '').trim();
  const laps = rawLaps === '' ? null : Number(rawLaps);
  if (laps !== null && (!Number.isInteger(laps) || laps < 1)) {
    return { ok: false, message: 'Laps must be a whole number of at least 1.' };
  }

  try {
    await executeAsAdmin<UpdateRaceMetadataMutation, Record<string, unknown>>(UPDATE_METADATA, {
      slug,
      laps,
      name: String(formData.get('name') ?? '') || null,
      country: String(formData.get('country') ?? '') || null,
      // Not coalesced to null: an empty string is a meaningful instruction to
      // clear the circuit name, which is the one nullable field of the three.
      circuitName: String(formData.get('circuitName') ?? ''),
    });
  } catch (error) {
    return { ok: false, message: messageOf(error) };
  }

  invalidateRaces();
  return { ok: true, message: `Updated ${slug}.` };
}

export async function triggerIngestAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const raw = String(formData.get('sessionKey') ?? '').trim();
  const sessionKey = Number(raw);
  if (!Number.isInteger(sessionKey) || sessionKey <= 0) {
    return { ok: false, message: 'A numeric OpenF1 session key is required.' };
  }

  let result: TriggerIngestMutation;
  try {
    result = await executeAsAdmin<TriggerIngestMutation, { sessionKey: number }>(
      TRIGGER_INGEST,
      { sessionKey },
    );
  } catch (error) {
    // The failure is already recorded in ingest_runs by run.ts, so this only
    // has to surface it. The runs page is where the detail lives.
    return { ok: false, message: `Import failed: ${messageOf(error)}` };
  }

  invalidateRaces();

  const { slug, rowsWritten, warnings } = result.triggerIngest;
  const warningNote = warnings.length > 0 ? ` ${warnings.length} warning(s) — see runs.` : '';
  return { ok: true, message: `Imported ${slug}: ${rowsWritten} rows.${warningNote}` };
}

/**
 * A resolver error reaches here as a GraphQLError whose message is safe to
 * show — they are written by this codebase, not by a driver. Anything else is
 * reported generically rather than leaking an internal string into the UI.
 */
function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}

const SET_FEATURED = /* GraphQL */ `
  mutation SetRaceFeatured($slug: String!, $featured: Boolean!) {
    setRaceFeatured(slug: $slug, featured: $featured) {
      slug
      isFeatured
    }
  }
`;

const UPDATE_METADATA = /* GraphQL */ `
  mutation UpdateRaceMetadata(
    $slug: String!
    $laps: Int
    $name: String
    $country: String
    $circuitName: String
  ) {
    updateRaceMetadata(
      slug: $slug
      laps: $laps
      name: $name
      country: $country
      circuitName: $circuitName
    ) {
      slug
      laps
      meeting {
        name
        country
        circuitName
      }
    }
  }
`;

const TRIGGER_INGEST = /* GraphQL */ `
  mutation TriggerIngest($sessionKey: Int!) {
    triggerIngest(sessionKey: $sessionKey) {
      slug
      rowsWritten
      warnings
    }
  }
`;
