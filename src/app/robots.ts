import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/**
 * `/admin` and `/login` are behind the proxy guard and answer nothing useful to
 * a crawler; `/api` is GraphQL and the cron endpoint. Disallowing them is not a
 * security measure — the guard is — it just keeps them out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/login', '/api'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
