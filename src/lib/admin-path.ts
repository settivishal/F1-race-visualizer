/**
 * Is this a path inside the admin area?
 *
 * Used to validate the `from` parameter the login page redirects to after a
 * successful sign-in. Taking that value at face value would make it an open
 * redirect: an attacker sends a link to the genuine login page, the victim
 * signs in for real, and the redirect lands them somewhere else entirely.
 *
 * An allowlist rather than a blocklist, which is what keeps it to one line. The
 * pattern requires the string to begin `/admin` and then either end or continue
 * with `/`, so a protocol-relative `//evil.example` (the character after the
 * first slash is not `a`) and `/administrator-elsewhere` are both rejected
 * without either needing a case of its own.
 *
 * Its own module rather than a helper inside the login page: it is pure, and
 * importing the page to test it drags in Auth.js and the whole Next server
 * runtime.
 */
export function isAdminPath(value: string): boolean {
  return /^\/admin(?:\/|$)/.test(value);
}
