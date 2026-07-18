import { Check } from 'lucide-react';
import { foundingCustomer } from '@/config/marketing-content';
import { siteConfig } from '@/config/site-config';
import { container } from './styles';
import { FlowCtaButton } from './flow-cta-button';

/** Honest launch-stage program — no fabricated reviews or customer counts. */
export function FoundingCustomerSection() {
  if (!siteConfig.foundingCustomerProgramEnabled) return null;
  return (
    <section className="bg-brand-mist py-16 md:py-20">
      <div className={container}>
        <div className="mx-auto flex max-w-3xl flex-col items-center rounded-2xl border border-brand-blue/25 bg-gradient-to-b from-brand-aqua/60 to-white px-6 py-10 text-center sm:px-12">
          <span className="rounded-full bg-brand-green/10 px-3.5 py-1 text-sm font-semibold text-brand-green">
            Launch program
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">
            {foundingCustomer.heading}
          </h2>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-brand-ink">{foundingCustomer.copy}</p>
          <ul className="mt-6 flex flex-col gap-2.5 text-left sm:flex-row sm:gap-8">
            {foundingCustomer.benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-[15px] font-semibold text-brand-navy">
                <Check size={17} className="shrink-0 text-brand-green" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
          <FlowCtaButton className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-blue px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-bluedark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy">
            {foundingCustomer.cta}
          </FlowCtaButton>
        </div>
      </div>
    </section>
  );
}
