import type { MetadataRoute } from 'next';
import { PRODUCTION_APP_URL } from '@/lib/env';

// Search engines index the storefront and portal entry; the admin app,
// auth flows, and APIs stay out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/portal'],
        disallow: [
          '/dashboard',
          '/customers',
          '/orders',
          '/invoices',
          '/inventory',
          '/pricing',
          '/reports',
          '/requests',
          '/routes',
          '/settings',
          '/login',
          '/portal/', // individual customer pages are tokenized — never index
          '/signup/success', // post-checkout page — meaningless in the index
          '/api/',
        ],
      },
    ],
    sitemap: `${PRODUCTION_APP_URL}/sitemap.xml`,
  };
}
