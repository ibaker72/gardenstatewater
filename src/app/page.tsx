import type { Metadata } from 'next';
import { getConfig } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { publicEmail, publicPhone, siteConfig } from '@/config/site-config';
import { AnnouncementBar } from '@/components/marketing/announcement-bar';
import { SiteHeader } from '@/components/marketing/site-header';
import { HeroSection } from '@/components/marketing/hero-section';
import { AvailabilityChecker } from '@/components/marketing/availability-checker';
import { DeliveryTypeSection } from '@/components/marketing/delivery-type-section';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { DeliveryOptions } from '@/components/marketing/delivery-options';
import { BenefitsSection } from '@/components/marketing/benefits-section';
import { ServiceAreaSection } from '@/components/marketing/service-area-section';
import { FoundingCustomerSection } from '@/components/marketing/founding-customer-section';
import { FaqSection } from '@/components/marketing/faq-section';
import { FinalCta } from '@/components/marketing/final-cta';
import { SiteFooter } from '@/components/marketing/site-footer';
import { LandingFlowProvider } from '@/components/marketing/landing-context';
import { Reveal } from '@/components/marketing/reveal';
import { DeliveryRequestFlow } from '@/components/signup/delivery-request-flow';

export const dynamic = 'force-dynamic';

const TITLE = '5-Gallon Water Delivery in North Jersey | Garden State Water';
const DESCRIPTION =
  'Request convenient 5-gallon water delivery for your North Jersey home or business. Check local availability, bottle options, and dispenser service.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: siteConfig.businessName,
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Garden State Water — 5-gallon water delivery in North Jersey' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og.png'] },
};

// The landing page shares the app shell with the dark-mode admin — force light.
const forceLight = `document.documentElement.classList.remove('dark');`;

export default async function LandingPage() {
  // Fail-soft: the marketing page must render even if the database is down.
  const [config, zones] = await Promise.all([
    getConfig().catch(() => null),
    prisma.zone.findMany({ select: { name: true }, orderBy: { name: 'asc' } }).catch(() => []),
  ]);

  const supportPhone = publicPhone(config?.businessPhone);
  const supportEmail = publicEmail(config?.businessEmail);
  const areaNames = siteConfig.showServiceAreaNames
    ? zones.map((z) => z.name.replace(/^Zone \d+ — /, ''))
    : [];

  // LocalBusiness structured data — verified/configured values only.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config?.businessName ?? siteConfig.businessName,
    description: DESCRIPTION,
    url: 'https://gardenstatewater.com',
    ...(supportPhone ? { telephone: supportPhone } : {}),
    ...(supportEmail ? { email: supportEmail } : {}),
    ...(areaNames.length > 0 ? { areaServed: areaNames } : {}),
  };

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

      <AnnouncementBar />
      <SiteHeader />

      <LandingFlowProvider>
        <main id="main">
          <HeroSection />
          <AvailabilityChecker />
          <Reveal>
            <DeliveryTypeSection />
          </Reveal>
          <Reveal>
            <HowItWorks />
          </Reveal>
          <Reveal>
            <DeliveryOptions />
          </Reveal>
          <BenefitsSection />
          <Reveal>
            <ServiceAreaSection areaNames={areaNames} />
          </Reveal>
          <FoundingCustomerSection />
          <FaqSection />
          <DeliveryRequestFlow />
          <FinalCta />
        </main>
      </LandingFlowProvider>

      <SiteFooter supportEmail={supportEmail} supportPhone={supportPhone} />
    </div>
  );
}
