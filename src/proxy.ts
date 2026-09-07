import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * The page guard.
 *
 * `middleware.ts` was renamed to `proxy.ts` in Next 16 — same behaviour, new
 * file and export name. See docs/decisions.md, "middleware.ts is proxy.ts now".
 *
 * This is a redirect for humans, not a security boundary. It stops a logged-out
 * visitor landing on an admin page; it does not stop anyone POSTing to a Server
 * Action or to /api/graphql, because a proxy sees neither as an admin route.
 * Those are guarded where they live — every action calls `auth()` itself, and
 * every admin resolver checks the session in context.
 *
 * Next's own Proxy reference is direct about this: "A matcher change or a
 * refactor that moves a Server Function to a different route can silently
 * remove Proxy coverage. Always verify authentication and authorization inside
 * each Server Function rather than relying on Proxy alone."
 *
 * No database access here. The session is a JWT, so this is a signature check.
 */
export default auth((request) => {
  if (request.auth) return NextResponse.next();

  const loginUrl = new URL('/login', request.nextUrl.origin);
  // So a deep link into the admin survives the round trip through login.
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ['/admin/:path*'],
};
