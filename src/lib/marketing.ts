import { prisma } from './prisma';
import { getConfig } from './pricing';
import {
  launchDeals,
  launchPlans,
  launchServiceZipRows,
  townSlug,
} from '@/config/launch-service-area';

/**
 * Server-side data access for the public marketing site.
 *
 * Every fetcher is fail-soft with a sensible compile-time fallback (the
 * launch dataset), so the storefront renders complete — plans, deals, and
 * service areas — even if the database is briefly unreachable. Only plain
 * serializable shapes leave this module, so client components can take them
 * as props directly.
 */

export interface PublicPlan {
  key: string;
  name: string;
  tagline: string | null;
  monthlyPrice: number;
  priceUnit: string; // 'month' | 'jug'
  jugsPerMonth: number;
  badge: string | null;
  features: string[];
  isSubscription: boolean;
  customQuote: boolean;
}

export interface PublicAddOns {
  dispenserRentalPrice: number;
  dispenserPurchasePrice: number;
  jugDepositPrice: number;
  bottleCasePrice: number;
  oneTimeJugPrice: number;
  oneTimeDeliveryFee: number;
  annualFreeMonths: number;
  firstDeliveryDiscountPct: number;
}

export interface PublicDeal {
  title: string;
  description: string | null;
  badge: string | null;
}

export interface PublicTown {
  town: string;
  state: string;
  slug: string;
  zips: string[];
}

export interface RegionGroup {
  region: string;
  state: string;
  towns: PublicTown[];
}

export const DEFAULT_ADD_ONS: PublicAddOns = {
  dispenserRentalPrice: 7,
  dispenserPurchasePrice: 129,
  jugDepositPrice: 10,
  bottleCasePrice: 8.99,
  oneTimeJugPrice: 11.99,
  oneTimeDeliveryFee: 4.99,
  annualFreeMonths: 1,
  firstDeliveryDiscountPct: 50,
};

const FALLBACK_PLANS: PublicPlan[] = launchPlans.map((p) => ({
  key: p.key,
  name: p.name,
  tagline: p.tagline,
  monthlyPrice: p.monthlyPrice,
  priceUnit: p.priceUnit,
  jugsPerMonth: p.jugsPerMonth,
  badge: p.badge,
  features: [...p.features],
  isSubscription: p.isSubscription,
  customQuote: p.customQuote,
}));

/** Active public pricing tiers, cheapest anchor first. */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  try {
    const rows = await prisma.sitePlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (rows.length === 0) return FALLBACK_PLANS;
    return rows.map((p) => ({
      key: p.key,
      name: p.name,
      tagline: p.tagline,
      monthlyPrice: p.monthlyPrice,
      priceUnit: p.priceUnit,
      jugsPerMonth: p.jugsPerMonth,
      badge: p.badge,
      features: p.features,
      isSubscription: p.isSubscription,
      customQuote: p.customQuote,
    }));
  } catch {
    return FALLBACK_PLANS;
  }
}

/** Storefront add-on prices from pricing_config (single source of truth). */
export async function getPublicAddOns(): Promise<PublicAddOns> {
  try {
    const config = await getConfig();
    return {
      dispenserRentalPrice: config.dispenserRentalPrice,
      dispenserPurchasePrice: config.dispenserPurchasePrice,
      jugDepositPrice: config.jugDepositPrice,
      bottleCasePrice: config.bottleCasePrice,
      oneTimeJugPrice: config.oneTimeJugPrice,
      oneTimeDeliveryFee: config.oneTimeDeliveryFee,
      annualFreeMonths: config.annualFreeMonths,
      firstDeliveryDiscountPct: config.firstDeliveryDiscountPct,
    };
  } catch {
    return DEFAULT_ADD_ONS;
  }
}

/** Active offers for the Deals section (banner rows excluded). */
export async function getActiveDeals(): Promise<PublicDeal[]> {
  try {
    const rows = await prisma.deal.findMany({
      where: { active: true, slot: 'offer' },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((d) => ({ title: d.title, description: d.description, badge: d.badge }));
  } catch {
    return launchDeals
      .filter((d) => d.slot === 'offer')
      .map((d) => ({ title: d.title, description: d.description, badge: d.badge }));
  }
}

/** The seasonal announcement banner (first active banner row), or null. */
export async function getBannerDeal(): Promise<PublicDeal | null> {
  try {
    const row = await prisma.deal.findFirst({
      where: { active: true, slot: 'banner' },
      orderBy: { sortOrder: 'asc' },
    });
    return row ? { title: row.title, description: row.description, badge: row.badge } : null;
  } catch {
    const fallback = launchDeals.find((d) => d.slot === 'banner');
    return fallback ? { title: fallback.title, description: fallback.description, badge: fallback.badge } : null;
  }
}

function groupIntoRegions(
  rows: { zip: string; town: string; state: string; region: string; slug: string }[]
): RegionGroup[] {
  const regions = new Map<string, RegionGroup>();
  for (const row of rows) {
    let region = regions.get(row.region);
    if (!region) {
      region = { region: row.region, state: row.state, towns: [] };
      regions.set(row.region, region);
    }
    let town = region.towns.find((t) => t.slug === row.slug);
    if (!town) {
      town = { town: row.town, state: row.state, slug: row.slug, zips: [] };
      region.towns.push(town);
    }
    town.zips.push(row.zip);
  }
  for (const region of regions.values()) {
    region.towns.sort((a, b) => a.town.localeCompare(b.town));
  }
  // NJ regions first (launch order), then NY.
  return [...regions.values()].sort((a, b) =>
    a.state === b.state ? a.region.localeCompare(b.region) : a.state.localeCompare(b.state)
  );
}

/** The serviceable map grouped for the homepage + footer + SEO pages. */
export async function getServiceRegions(): Promise<RegionGroup[]> {
  try {
    const rows = await prisma.serviceZip.findMany({
      where: { active: true },
      orderBy: [{ state: 'asc' }, { region: 'asc' }, { town: 'asc' }, { zip: 'asc' }],
    });
    if (rows.length === 0) return groupIntoRegions(launchServiceZipRows());
    return groupIntoRegions(rows);
  } catch {
    return groupIntoRegions(launchServiceZipRows());
  }
}

/** All serviceable towns flattened (SEO landing pages, sitemap, footer). */
export async function getServiceTowns(): Promise<PublicTown[]> {
  const regions = await getServiceRegions();
  return regions.flatMap((r) => r.towns);
}

/** A single town by its landing-page slug, with region context. */
export async function getTownBySlug(
  slug: string
): Promise<(PublicTown & { region: string }) | null> {
  const regions = await getServiceRegions();
  for (const region of regions) {
    const town = region.towns.find((t) => t.slug === slug);
    if (town) return { ...town, region: region.region };
  }
  return null;
}

export { townSlug };

export interface PublicTestimonial {
  name: string;
  quote: string;
  /** True for the built-in sample cards shown before real quotes exist. */
  example: boolean;
}

/**
 * Placeholder cards shown (clearly labeled as examples) until the owner adds
 * real customer quotes from Settings.
 */
const EXAMPLE_TESTIMONIALS: PublicTestimonial[] = [
  {
    name: 'Sample — the Hendersons, Short Hills',
    quote: 'Delivery day is automatic now. The jugs show up, the empties disappear, and nobody in this house has carried water since March.',
    example: true,
  },
  {
    name: 'Sample — home gym owner, Montclair',
    quote: 'Between workouts and two teenagers we go through a ridiculous amount of water. The Family plan keeps the dispenser stocked without me thinking about it.',
    example: true,
  },
  {
    name: 'Sample — office manager, Morristown',
    quote: 'Same delivery day every week, one invoice a month, and I can text our driver directly. Exactly what our old national provider never managed.',
    example: true,
  },
];

/** Owner-curated quotes, or clearly-labeled examples when none exist yet. */
export async function getTestimonials(): Promise<PublicTestimonial[]> {
  try {
    const rows = await prisma.testimonial.findMany({
      where: { featured: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    if (rows.length === 0) return EXAMPLE_TESTIMONIALS;
    return rows.map((t) => ({ name: t.name, quote: t.quote, example: false }));
  } catch {
    return EXAMPLE_TESTIMONIALS;
  }
}
