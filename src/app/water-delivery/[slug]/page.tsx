import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import {
  getPublicAddOns,
  getPublicPlans,
  getServiceRegions,
  getTownBySlug,
} from '@/lib/marketing';
import { countyForSlug, townFaqs, townIntro, type TownContext } from '@/lib/local-seo';
import { displayPrice, perJugPrice } from '@/lib/plan-pricing';
import { PRODUCTION_APP_URL } from '@/lib/env';
import { siteConfig } from '@/config/site-config';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { btnPrimary, btnSecondary } from '@/components/marketing/styles';

/**
 * Local-SEO landing page, one per serviceable town, generated from the
 * owner-managed `service_zips` table: /water-delivery/morristown-nj etc.
 *
 * Served from the ISR cache for fast TTFB (a Core Web Vitals ranking input);
 * admin edits revalidate the whole /water-delivery tree immediately.
 */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const town = await getTownBySlug(slug);
  if (!town) return { title: { absolute: 'Water Delivery | Garden State Water' } };
  const county = countyForSlug(slug);
  const title = `Water Delivery in ${town.town}, ${town.state} | Garden State Water`;
  const description = `5-gallon spring water delivered weekly to ${town.town}${county ? ` (${county})` : ''} homes and offices. Free delivery, jug exchange, no contracts — first delivery 50% off. ZIP${town.zips.length === 1 ? '' : 's'}: ${town.zips.slice(0, 6).join(', ')}.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/water-delivery/${slug}` },
    // OG image comes from the sibling opengraph-image.tsx (per-town artwork).
    openGraph: {
      title,
      description,
      url: `/water-delivery/${slug}`,
      siteName: siteConfig.businessName,
      type: 'website',
      locale: 'en_US',
    },
    twitter: { card: 'summary_large_image', title, description },
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
  const county = countyForSlug(slug);
  const hydrate = plans.find((p) => p.key === 'hydrate') ?? plans.find((p) => p.isSubscription);
  const neighbors =
    regions
      .find((r) => r.region === town.region)
      ?.towns.filter((t) => t.slug !== town.slug)
      .slice(0, 8) ?? [];

  const context: TownContext = { town, neighbors, plans, addOns };
  const intro = townIntro(context);
  const faqs = townFaqs(context);
  const pageUrl = `${PRODUCTION_APP_URL}/water-delivery/${town.slug}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${pageUrl}#business`,
      name: siteConfig.businessName,
      description: `5-gallon spring water delivery in ${town.town}, ${town.state}.`,
      url: pageUrl,
      priceRange: '$$',
      areaServed: [`${town.town}, ${town.state}`, ...(county ? [county] : []), ...town.zips],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Water delivery plans',
        itemListElement: plans
          .filter((p) => !p.customQuote)
          .map((p) => ({
            '@type': 'Offer',
            name: p.name,
            price: p.monthlyPrice.toFixed(2),
            priceCurrency: 'USD',
            description: p.isSubscription
              ? `${p.jugsPerMonth} five-gallon jugs per month, free weekly delivery in ${town.town}.`
              : `One-time 5-gallon jug delivery in ${town.town} (per jug).`,
          })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: PRODUCTION_APP_URL },
        { '@type': 'ListItem', position: 2, name: 'Service Areas', item: `${PRODUCTION_APP_URL}/water-delivery` },
        { '@type': 'ListItem', position: 3, name: `${town.town}, ${town.state}`, item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ];

  const forceLight = `document.documentElement.classList.remove('dark');`;

  return (
    <div style={{ colorScheme: 'light' }} className="flex min-h-screen flex-col bg-white font-sans text-brand-navy">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-brand-mist">
          <div className="mx-auto w-full max-w-site px-5 pb-14 pt-8 sm:px-8 md:pt-10">
            <nav aria-label="Breadcrumb" className="text-sm text-brand-ink">
              <ol className="flex flex-wrap items-center gap-1">
                <li>
                  <a href="/" className="rounded hover:text-brand-blue hover:underline">Home</a>
                </li>
                <li className="flex items-center gap-1">
                  <ChevronRight size={14} aria-hidden="true" />
                  <a href="/water-delivery" className="rounded hover:text-brand-blue hover:underline">Service Areas</a>
                </li>
                <li className="flex items-center gap-1">
                  <ChevronRight size={14} aria-hidden="true" />
                  <span aria-current="page" className="font-semibold text-brand-navy">{town.town}, {town.state}</span>
                </li>
              </ol>
            </nav>

            <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">
              <MapPin size={15} aria-hidden="true" /> {town.region}
              {county ? ` · ${county}` : ''} · {town.state}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-brand-navy sm:text-5xl">
              Water delivery in {town.town}, {town.state}
            </h1>
            {intro.map((paragraph) => (
              <p key={paragraph.slice(0, 32)} className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-ink">
                {paragraph}
              </p>
            ))}
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

              {/* Town FAQ — native <details>, fully crawlable, zero JS */}
              <h2 className="mt-12 text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">
                {town.town} water delivery FAQs
              </h2>
              <div className="mt-5 divide-y divide-brand-line border-y border-brand-line">
                {faqs.map((faq) => (
                  <details key={faq.question} className="group py-1">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-semibold text-brand-navy transition-colors hover:text-brand-blue [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <ChevronDown
                        size={20}
                        aria-hidden="true"
                        className="shrink-0 text-brand-blue transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <p className="max-w-2xl pb-4 text-[15px] leading-relaxed text-brand-ink">{faq.answer}</p>
                  </details>
                ))}
              </div>
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
                      Water delivery {n.town}, {n.state}
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
