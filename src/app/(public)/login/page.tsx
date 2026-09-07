import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { auth, signIn } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/ui/page-container';
import { isAdminPath } from '@/lib/admin-path';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Sign in — F1 Race Visualizer',
  // The one page on the site that should never be indexed.
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * The only unauthenticated form on the site.
 *
 * The page is deliberately not async. Reading the session means reading
 * cookies, and with Cache Components a cookie read outside a Suspense boundary
 * is a build error — the same constraint that shaped `/races` in M2, where it
 * was `searchParams`. So the heading prerenders into the static shell and only
 * the form, which genuinely depends on the request, streams in.
 *
 * See node_modules/next/dist/docs/01-app/02-guides/
 * authentication-with-cache-components.md.
 */
export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer className="max-w-md py-16">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-muted">Admin access only. There is no public account.</p>

      <Suspense fallback={<FormSkeleton />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

/**
 * A Server Action rather than a client component: `signIn` runs on the server,
 * so the password never enters a client bundle's scope and there is no fetch to
 * write.
 */
async function authenticate(formData: FormData) {
  'use server';

  const target = String(formData.get('from') ?? '/admin');
  const safeTarget = isAdminPath(target) ? target : '/admin';

  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: safeTarget,
    });
  } catch (error) {
    // A successful signIn throws a redirect, which has to propagate. Only a
    // genuine authentication failure becomes an error state.
    if (error instanceof AuthError) {
      redirect(`/login?error=1&from=${encodeURIComponent(safeTarget)}`);
    }
    throw error;
  }
}

async function LoginForm({ searchParams }: { searchParams: SearchParams }) {
  if (await auth()) redirect('/admin');

  const params = await searchParams;
  const raw = Array.isArray(params.from) ? params.from[0] : params.from;
  const from = raw && isAdminPath(raw) ? raw : '/admin';
  const failed = params.error !== undefined;

  return (
    <Card className="mt-8">
      <form action={authenticate} className="space-y-4">
        <input type="hidden" name="from" value={from} />
        <Input label="Email" name="email" type="email" autoComplete="username" required autoFocus />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />

        {failed ? (
          // Deliberately does not say which of the two was wrong.
          <p role="alert" className="text-sm text-flag-red">
            Those credentials did not match.
          </p>
        ) : null}

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </Card>
  );
}

function FormSkeleton() {
  return (
    <Card className="mt-8">
      <div className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
  );
}
