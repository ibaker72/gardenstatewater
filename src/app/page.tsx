import type { Metadata } from 'next';
import { getConfig } from '@/lib/pricing';
import {
  getActiveDeals,
  getBannerDeal,
  getPublicAddOns,
  getPublicPlans,
  getServiceRegions,
  getTestimonials,
} from '@/lib/marketing';
import { publicEmail, publicPhone, siteConfig } from '@/config/site-config';
import { AnnouncementBar } from '@/components/marketing/announcement-bar';
import { SiteHeader } from '@/components/marketing/site-header';
import { HeroSection } from '@/components/marketing/hero-section';
import { PricingSection } from '@/components/marketing/pricing-section';
import { ServiceAreaSection } from '@/components/marketing/service-area-section';
import { DealsSection } from '@/components/marketing/deals-section';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { ComparisonSection } from '@/components/marketing/comparison-section';
import { TestimonialsSection } from '@/components/marketing/testimonials-section';
import { FaqSection } from '@/components/marketing/faq-section';
import { FinalCta } from '@/components/marketing/final-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Reveal } from '@/components/marketing/reveal';
import { faqs } from '@/config/marketing-content';

export const dynamic = 'force-dynamic';

const TITLE = '5-Gallon Water Delivery in NJ & NY — Subscribe & Save | Garden State Water';
const DESCRIPTION =
  '5-gallon spring water delivered to your door across New Jersey & New York. Weekly jug exchange from $39/month, free delivery, no contracts. First delivery 50% off.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: siteConfig.businessName,
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Garden State Water — 5-gallon water delivery across New Jersey & New York' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og.png'] },
};

// The landing page shares the app shell with the dark-mode admin — force light.
const forceLight = `document.documentElement.classList.remove('dark');`;

export default async function LandingPage() {
  // Fail-soft: the marketing page must render complete even if the database
  // is down — every fetcher falls back to the launch dataset.
  const [config, plans, addOns, deals, banner, regions, testimonials] = await Promise.all([
    getConfig().catch(() => null),
    getPublicPlans(),
    getPublicAddOns(),
    getActiveDeals(),
    getBannerDeal(),
    getServiceRegions(),
    getTestimonials(),
  ]);

  const supportPhone = publicPhone(config?.businessPhone);
  const supportEmail = publicEmail(config?.businessEmail);
  const areaNames = regions.flatMap((r) => r.towns.map((t) => `${t.town}, ${t.state}`));

  // LocalBusiness + FAQ structured data — configured values only.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: config?.businessName ?? siteConfig.businessName,
      description: DESCRIPTION,
      url: 'https://gardenstatewater.com',
      priceRange: '$$',
      ...(supportPhone ? { telephone: supportPhone } : {}),
      ...(supportEmail ? { email: supportEmail } : {}),
      ...(areaNames.length > 0 ? { areaServed: areaNames } : {}),
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

  return (
    <div id="top" style={{ colorScheme: 'light' }} className="bg-white font-sans text-brand-navy">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-brand-navy focus:px-4 focus:py-3 focus:text-white"
      >
        Skip to content
      </a>

      <AnnouncementBar banner={banner} />
      <SiteHeader />

      <main id="main">
        <HeroSection />
        <PricingSection plans={plans} addOns={addOns} />
        <Reveal>
          <ServiceAreaSection regions={regions} />
        </Reveal>
        <Reveal>
          <DealsSection deals={deals} />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
        <Reveal>
          <ComparisonSection />
        </Reveal>
        <Reveal>
          <TestimonialsSection testimonials={testimonials} />
        </Reveal>
        <FaqSection />
        <FinalCta />
      </main>

      <SiteFooter supportEmail={supportEmail} supportPhone={supportPhone} regions={regions} />
    </div>
  );
}
