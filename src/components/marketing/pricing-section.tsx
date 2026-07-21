'use client';

import { Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { PublicAddOns, PublicPlan } from '@/lib/marketing';
import { pricingCopy } from '@/config/marketing-content';
import {
  annualMonthlyEquivalent,
  annualPrice,
  displayPrice,
  perJugPrice,
} from '@/lib/plan-pricing';
import { container, sectionEyebrow, sectionHeading } from './styles';

type Billing = 'monthly' | 'annual';

/**
 * The public pricing table: 4 tiers from `site_plans` + add-on prices from
 * `pricing_config`, with a monthly/annual toggle that reprices the
 * subscription cards in real time (annual = N months free).
 */
export function PricingSection({ plans, addOns }: { plans: PublicPlan[]; addOns: PublicAddOns }) {
  const [billing, setBilling] = useState<Billing>('monthly');
  const freeMonths = addOns.annualFreeMonths;

  const addOnItems = [
    {
      label: 'Dispenser rental',
      price: `${displayPrice(addOns.dispenserRentalPrice)}/month`,
      note: 'Free on Family & Office plans',
    },
    { label: 'Dispenser purchase', price: displayPrice(addOns.dispenserPurchasePrice), note: 'Yours to keep' },
    {
      label: 'First-time bottle deposit',
      price: `${displayPrice(addOns.jugDepositPrice)}/jug`,
      note: 'Fully refundable',
    },
    {
      label: 'Case of 16.9oz bottles',
      price: displayPrice(addOns.bottleCasePrice),
      note: 'Add to any delivery',
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-24 bg-white py-16 md:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>{pricingCopy.eyebrow}</p>
          <h2 className={sectionHeading}>{pricingCopy.heading}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-ink sm:text-lg">
            {pricingCopy.supporting}
          </p>

          {/* Billing toggle */}
          <div className="mt-7 inline-flex items-center gap-1 rounded-full border border-brand-line bg-brand-mist p-1">
            {(['monthly', 'annual'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBilling(option)}
                aria-pressed={billing === option}
                className={`min-h-10 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue ${
                  billing === option
                    ? 'bg-brand-navy text-white'
                    : 'text-brand-ink hover:text-brand-navy'
                }`}
              >
                {option === 'monthly' ? 'Monthly' : `Annual — ${freeMonths} month${freeMonths === 1 ? '' : 's'} free`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-brand-ink" aria-live="polite">
            {billing === 'annual'
              ? `Annual prices shown per month, billed once a year (${freeMonths} month${freeMonths === 1 ? '' : 's'} free).`
              : pricingCopy.annualNote}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} billing={billing} freeMonths={freeMonths} />
          ))}
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[15px] font-semibold text-brand-navy">
          <Sparkles size={17} className="shrink-0 text-brand-blue" aria-hidden="true" />
          {pricingCopy.firstDeliveryOffer}
        </p>

        {/* Add-ons */}
        <div className="mt-12 rounded-2xl border border-brand-line bg-brand-mist p-6 sm:p-8">
          <h3 className="text-lg font-bold text-brand-navy">{pricingCopy.addOnsHeading}</h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {addOnItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-brand-line bg-white p-4">
                <dt className="text-sm font-semibold text-brand-navy">{item.label}</dt>
                <dd className="mt-1 text-xl font-bold text-brand-navy">{item.price}</dd>
                <dd className="mt-0.5 text-sm text-brand-ink">{item.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  billing,
  freeMonths,
}: {
  plan: PublicPlan;
  billing: Billing;
  freeMonths: number;
}) {
  const featured = Boolean(plan.badge);
  const annualEligible = plan.isSubscription && !plan.customQuote;
  const showAnnual = billing === 'annual' && annualEligible;

  const headlinePrice = showAnnual
    ? displayPrice(annualMonthlyEquivalent(plan.monthlyPrice, freeMonths))
    : displayPrice(plan.monthlyPrice);
  const priceSuffix = plan.priceUnit === 'jug' ? '/jug' : '/month';

  const subLine = plan.customQuote
    ? 'starts at — custom volume quoted'
    : showAnnual
      ? `billed ${displayPrice(annualPrice(plan.monthlyPrice, freeMonths))}/year`
      : plan.isSubscription
        ? `works out to ${displayPrice(perJugPrice(plan.monthlyPrice, plan.jugsPerMonth))}/jug`
        : 'no commitment';

  const href = plan.customQuote
    ? `/signup?plan=${plan.key}`
    : `/signup?plan=${plan.key}${annualEligible ? `&billing=${billing}` : ''}`;
  const cta = plan.customQuote
    ? 'Contact us for a custom quote'
    : plan.isSubscription
      ? `Start ${plan.name}`
      : 'Order a one-time delivery';

  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
        featured
          ? 'border-brand-blue shadow-[0_24px_60px_-28px_rgba(20,155,194,0.45)] ring-2 ring-brand-blue'
          : 'border-brand-line'
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-blue px-3.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {plan.badge}
        </span>
      )}
      <h3 className="text-lg font-bold text-brand-navy">{plan.name}</h3>
      {plan.tagline && <p className="mt-1 min-h-10 text-sm text-brand-ink">{plan.tagline}</p>}
      <p className="mt-4 flex items-baseline gap-1">
        {plan.customQuote && <span className="text-sm font-medium text-brand-ink">from</span>}
        <span className="text-4xl font-bold tracking-tight text-brand-navy">{headlinePrice}</span>
        <span className="text-[15px] font-medium text-brand-ink">{priceSuffix}</span>
      </p>
      <p className="mt-1 text-sm font-medium text-brand-blue">{subLine}</p>
      <ul className="mt-5 flex-1 space-y-2.5 border-t border-brand-line pt-5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[15px] text-brand-navy">
            <Check size={17} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <a
        href={href}
        className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          featured
            ? 'bg-brand-blue text-white hover:bg-brand-bluedark focus-visible:outline-brand-navy'
            : 'border border-brand-line bg-white text-brand-navy hover:border-brand-blue hover:bg-brand-mist focus-visible:outline-brand-blue'
        }`}
      >
        {cta}
      </a>
    </article>
  );
}
