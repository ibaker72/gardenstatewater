import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { siteConfig } from '@/config/site-config';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = {
  title: 'Welcome to Garden State Water!',
  robots: { index: false },
};

const forceLight = `document.documentElement.classList.remove('dark');`;

const COPY = {
  subscription: {
    heading: 'Welcome to Garden State Water!',
    body: 'You’re all set. We’ll text you shortly to confirm your first delivery — it’s 50% off, and your delivery day repeats weekly from there. Leave the jug-hauling to us.',
  },
  one_time: {
    heading: 'Your delivery is booked!',
    body: 'We’ll text you shortly to confirm the details of your one-time delivery. If you like what you taste, any subscription starts with 50% off the first delivery.',
  },
  quote: {
    heading: 'Quote request received!',
    body: 'We’ll call you within one business day with a custom volume quote for your business — dedicated delivery day, Net-30 invoicing, and dispensers included.',
  },
} as const;

/** Post-checkout / post-signup landing. */
export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const params = await searchParams;
  const variant = (params.v ?? 'subscription') as keyof typeof COPY;
  const copy = COPY[variant] ?? COPY.subscription;

  return (
    <div style={{ colorScheme: 'light' }} className="flex min-h-screen flex-col bg-brand-mist font-sans text-brand-navy">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-site flex-1 items-center justify-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-xl rounded-2xl border border-brand-line bg-white p-8 text-center shadow-[0_18px_50px_-24px_rgba(11,41,69,0.2)] sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-brand-green">
            <CheckCircle2 size={34} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-brand-navy">{copy.heading}</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-brand-ink">{copy.body}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={siteConfig.customerPortalPath}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-blue px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-bluedark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
            >
              Set up my customer portal
            </a>
            <a
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-line bg-white px-6 py-3 text-base font-semibold text-brand-navy transition-colors hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              Back to homepage
            </a>
          </div>
          <p className="mt-6 text-sm text-brand-ink">
            Your portal shows deliveries, invoices, your referral code — and lets you pause or skip
            any week.
          </p>
        </div>
      </main>
      <SiteFooter supportEmail={null} supportPhone={null} />
    </div>
  );
}
