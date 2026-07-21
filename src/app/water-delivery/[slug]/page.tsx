import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, MapPin, Sparkles } from 'lucide-react';
import {
  getPublicAddOns,
  getPublicPlans,
  getServiceRegions,
  getTownBySlug,
} from '@/lib/marketing';
import { displayPrice, perJugPrice } from '@/lib/plan-pricing';
import { siteConfig } from '@/config/site-config';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { btnPrimary, btnSecondary } from '@/components/marketing/styles';

export const dynamic = 'force-dynamic';

/**
 * Local-SEO landing page, one per serviceable town, generated from the
 * owner-managed `service_zips` table: /water-delivery/morristown-nj etc.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const town = await getTownBySlug(slug);
  if (!town) return { title: { absolute: 'Water Delivery | Garden State Water' } };
  const title = `Water Delivery in ${town.town}, ${town.state} | Garden State Water`;
  const description = `5-gallon spring water delivered to ${town.town} homes and offices weekly. Free delivery, jug exchange, no contracts — first delivery 50% off. Serving ZIP${town.zips.length === 1 ? '' : 's'} ${town.zips.slice(0, 6).join(', ')}.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/water-delivery/${slug}` },
    openGraph: { title, description, url: `/water-delivery/${slug}`, siteName: siteConfig.businessName, type: 'website', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  };
}

export default async function TownPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [town, plans, addOns, regions] = await Promise.all([
    getTownBySlug(slug),
    getPublicPlans(),
    getPublicAddOns(),
    getServiceRegions(),
  ]);
  if (!town) notFound();

  const primaryZip = town.zips[0];
  const hydrate = plans.find((p) => p.key === 'hydrate') ?? plans.find((p) => p.isSubscription);
  const neighbors =
    regions
      .find((r) => r.region === town.region)
      ?.towns.filter((t) => t.slug !== town.slug)
      .slice(0, 8) ?? [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteConfig.businessName,
    description: `5-gallon spring water delivery in ${town.town}, ${town.state}.`,
    url: `https://gardenstatewater.com/water-delivery/${town.slug}`,
    priceRange: '$$',
    areaServed: [`${town.town}, ${town.state}`, ...town.zips],
  };

  const forceLight = `document.documentElement.classList.remove('dark');`;

  return (
    <div style={{ colorScheme: 'light' }} className="flex min-h-screen flex-col bg-white font-sans text-brand-navy">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-brand-mist">
          <div className="mx-auto w-full max-w-site px-5 pb-14 pt-12 sm:px-8 md:pt-16">
            <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">
              <MapPin size={15} aria-hidden="true" /> {town.region} · {town.state}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-brand-navy sm:text-5xl">
              Water delivery in {town.town}, {town.state}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-ink">
              Fresh 5-gallon spring water, delivered to {town.town} doorsteps on the same day every
              week. We haul the jugs, swap your empties, and text you the night before — you just
              stay hydrated. Local family business, no contracts, cancel anytime.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={`/signup?zip=${primaryZip}`} className={btnPrimary}>
                Start My Subscription — 50% off first delivery
              </a>
              <a href="/#pricing" className={btnSecondary}>
                See Plans & Pricing
              </a>
            </div>
            <p className="mt-6 text-sm font-medium text-brand-ink">
              Serving {town.town} ZIP code{town.zips.length === 1 ? '' : 's'}: {town.zips.join(', ')}
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-site px-5 py-14 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
                Why {town.town} households switch to delivery
              </h2>
              <ul className="mt-6 space-y-3.5">
                {[
                  `Same delivery day every week on our ${town.region} route — with a text reminder the night before.`,
                  'Free delivery on every subscription; jug exchange included. Leave the empties out and we do the rest.',
                  hydrate
                    ? `From ${displayPrice(perJugPrice(hydrate.monthlyPrice, hydrate.jugsPerMonth))} per jug delivered — the supermarket exchange is $6.99 plus your time, your gas, and a 42-lb lift.`
                    : 'Simple monthly plans that cost less per jug than you’d expect.',
                  `Dispenser rental ${displayPrice(addOns.dispenserRentalPrice)}/month (free on Family & Office plans), or bring your own.`,
                  'No contracts. Pause for vacation, skip a week, or cancel anytime from your customer portal.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-brand-navy sm:text-base">
                    <Check size={18} className="mt-1 shrink-0 text-brand-green" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[15px] font-medium text-emerald-800">
                <Sparkles size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                New {town.town} customers get {Math.round(addOns.firstDeliveryDiscountPct)}% off their
                first delivery — applied automatically at checkout.
              </p>
            </div>

            <aside className="h-fit rounded-2xl border border-brand-line bg-brand-mist p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy">Popular plans in {town.town}</h2>
              <ul className="mt-4 space-y-3">
                {plans
                  .filter((p) => !p.customQuote)
                  .map((plan) => (
                    <li key={plan.key} className="rounded-xl border border-brand-line bg-white p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-brand-navy">{plan.name}</span>
                        <span className="whitespace-nowrap font-bold text-brand-navy">
                          {displayPrice(plan.monthlyPrice)}
                          <span className="text-sm font-medium text-brand-ink">
                            /{plan.priceUnit === 'jug' ? 'jug' : 'mo'}
                          </span>
                        </span>
                      </div>
                      {plan.tagline && <p className="mt-1 text-sm text-brand-ink">{plan.tagline}</p>}
                    </li>
                  ))}
              </ul>
              <a href={`/signup?zip=${primaryZip}`} className={`${btnPrimary} mt-5 w-full`}>
                Check my address & start
              </a>
              <p className="mt-3 text-center text-sm text-brand-ink">
                Offices in {town.town}?{' '}
                <a href={`/signup?zip=${primaryZip}&plan=office`} className="font-semibold text-brand-blue hover:underline">
                  Get a commercial quote
                </a>
              </p>
            </aside>
          </div>

          {neighbors.length > 0 && (
            <nav aria-label="Nearby service areas" className="mt-14 border-t border-brand-line pt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-ink">
                Also delivering near {town.town}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {neighbors.map((n) => (
                  <li key={n.slug}>
                    <a
                      href={`/water-delivery/${n.slug}`}
                      className="rounded text-[15px] font-medium text-brand-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                    >
                      {n.town}, {n.state}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/water-delivery" className="rounded text-[15px] font-medium text-brand-ink hover:underline">
                    All service areas →
                  </a>
                </li>
              </ul>
            </nav>
          )}
        </section>
      </main>

      <SiteFooter supportEmail={null} supportPhone={null} regions={regions} />
    </div>
  );
}
