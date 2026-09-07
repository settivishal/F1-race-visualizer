/**
 * The site's absolute origin.
 *
 * Everything else in the app links relatively, but three things have to name
 * the site: `metadataBase` (which resolves OG image URLs), the sitemap, and the
 * `Sitemap:` line in robots.txt. A crawler cannot follow `/races/monaco`.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` is the production domain and stays the
 * production domain inside a preview deployment — which is what canonical URLs
 * want, since a preview should not invite indexing of itself. `SITE_URL`
 * overrides it for the custom domain when that lands.
 */
export const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');
