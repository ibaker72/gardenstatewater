import type { Metadata } from 'next';
import { checkServiceArea } from '@/server/actions/service-area';
import { getPublicAddOns, getPublicPlans } from '@/lib/marketing';
import { normalizeZip } from '@/lib/service-area';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ZipChecker } from '@/components/marketing/zip-checker';
import { SignupFlow } from '@/components/signup/signup-flow';
import { billingChoices, type BillingChoice } from '@/lib/validation/signup';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Start Your Water Delivery Subscription | Garden State Water' },
  description:
    'Pick a plan, tell us where to deliver, and your first 5-gallon delivery is 50% off. No contracts — pause or cancel anytime.',
  alternates: { canonical: '/signup' },
};

const forceLight = `document.documentElement.classList.remove('dark');`;

/**
 * The signup entry: validates the ZIP server-side first (step 1 of the flow).
 * A serviceable ZIP goes straight into plan selection; anything else gets the
 * checker with its waitlist capture.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; plan?: string; billing?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const zip = normalizeZip(params.zip);
  const check = zip ? await checkServiceArea(zip) : null;
  const serviceable = check?.status === 'active' || check?.status === 'manual_review';

  const [plans, addOns] = serviceable
    ? await Promise.all([getPublicPlans(), getPublicAddOns()])
    : [[], null];

  const billing: BillingChoice = billingChoices.includes(params.billing as BillingChoice)
    ? (params.billing as BillingChoice)
    : 'monthly';

  return (
    <div style={{ colorScheme: 'light' }} className="flex min-h-screen flex-col bg-brand-mist font-sans text-brand-navy">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-site flex-1 px-5 py-12 sm:px-8 md:py-16">
        {serviceable && zip && addOns ? (
          <SignupFlow
            plans={plans}
            addOns={addOns}
            zip={zip}
            town={check?.town ?? null}
            initialPlanKey={params.plan ?? null}
            initialBilling={billing}
            canceled={params.canceled === '1'}
          />
        ) : (
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">Signup</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">
                First things first — where are we delivering?
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-brand-ink">
                {zip
                  ? 'We couldn’t match that ZIP to an active route — check it below or join the waitlist.'
                  : 'Enter your ZIP and we’ll take it from there. Your first delivery is 50% off.'}
              </p>
            </div>
            <div className="mt-8">
              <ZipChecker />
            </div>
            <p className="mt-6 text-center text-[15px] text-brand-ink">
              Just browsing?{' '}
              <a href="/#pricing" className="font-semibold text-brand-blue hover:underline">
                See plans & pricing
              </a>
            </p>
          </div>
        )}
      </main>
      <SiteFooter supportEmail={null} supportPhone={null} />
    </div>
  );
}
