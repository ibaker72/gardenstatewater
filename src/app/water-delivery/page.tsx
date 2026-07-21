import type { Metadata } from 'next';
import { getServiceRegions } from '@/lib/marketing';
import { siteConfig } from '@/config/site-config';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { MapPin } from 'lucide-react';

// ISR: served from cache for fast TTFB; admin ZIP edits revalidate the tree.
export const revalidate = 3600;

const TITLE = 'Water Delivery Service Areas — NJ & NY | Garden State Water';
const DESCRIPTION =
  '5-gallon spring water delivery across North Jersey, Morris & Essex, Central and South Jersey, the Shore, Manhattan, Brooklyn, Westchester, and Staten Island.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/water-delivery' },
};

const forceLight = `document.documentElement.classList.remove('dark');`;

/** Index of every town landing page, grouped by region — the local-SEO hub. */
export default async function ServiceAreasPage() {
  const regions = await getServiceRegions();

  return (
    <div style={{ colorScheme: 'light' }} className="flex min-h-screen flex-col bg-white font-sans text-brand-navy">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-site flex-1 px-5 py-12 sm:px-8 md:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">Service areas</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">
          Where {siteConfig.businessName} delivers
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-brand-ink sm:text-lg">
          Weekly 5-gallon spring water delivery across the NY–NJ metro. Pick your town for local
          details, or{' '}
          <a href="/#service-area" className="font-semibold text-brand-blue hover:underline">
            check your ZIP
          </a>{' '}
          for an instant answer.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {regions.map((region) => (
            <section
              key={region.region}
              id={region.region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
              className="scroll-mt-24 rounded-2xl border border-brand-line bg-brand-mist p-6"
            >
              <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
                <MapPin size={18} className="text-brand-blue" aria-hidden="true" />
                {region.region}, {region.state}
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {region.towns.map((town) => (
                  <li key={town.slug}>
                    <a
                      href={`/water-delivery/${town.slug}`}
                      className="inline-flex rounded-lg text-[15px] font-medium text-brand-navy hover:text-brand-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                    >
                      Water delivery in {town.town}, {town.state}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter supportEmail={null} supportPhone={null} regions={regions} />
    </div>
  );
}
