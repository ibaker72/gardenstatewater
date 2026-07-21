import type { MetadataRoute } from 'next';
import { PRODUCTION_APP_URL } from '@/lib/env';
import { getServiceTowns } from '@/lib/marketing';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Town pages come from the owner-managed serviceable-ZIP list (fail-soft:
  // the fetcher falls back to the launch dataset if the database is down).
  const towns = await getServiceTowns();

  return [
    { url: `${PRODUCTION_APP_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${PRODUCTION_APP_URL}/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${PRODUCTION_APP_URL}/water-delivery`, changeFrequency: 'weekly', priority: 0.7 },
    ...towns.map((town) => ({
      url: `${PRODUCTION_APP_URL}/water-delivery/${town.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    { url: `${PRODUCTION_APP_URL}/portal`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${PRODUCTION_APP_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${PRODUCTION_APP_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
