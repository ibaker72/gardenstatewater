import type { MetadataRoute } from 'next';
import { PRODUCTION_APP_URL } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${PRODUCTION_APP_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${PRODUCTION_APP_URL}/portal`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${PRODUCTION_APP_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${PRODUCTION_APP_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
