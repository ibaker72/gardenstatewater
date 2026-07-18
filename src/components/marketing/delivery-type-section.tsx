import { Building2, Check, House } from 'lucide-react';
import { deliveryAudiences } from '@/config/marketing-content';
import { siteConfig } from '@/config/site-config';
import { container, sectionEyebrow, sectionHeading } from './styles';
import { FlowCtaButton } from './flow-cta-button';

const ICONS = { home: House, business: Building2 } as const;

/** Two-panel split: residential vs. commercial delivery. */
export function DeliveryTypeSection() {
  const audiences = deliveryAudiences.filter((a) =>
    a.customerType === 'home' ? siteConfig.homeDeliveryEnabled : siteConfig.businessDeliveryEnabled
  );
  if (audiences.length === 0) return null;

  return (
    <section className="bg-white py-16 md:py-24">
      <div className={container}>
        <div className="max-w-2xl">
          <p className={sectionEyebrow}>Who we deliver to</p>
          <h2 className={sectionHeading}>Delivery built around how you use water.</h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {audiences.map((audience) => {
            const Icon = ICONS[audience.customerType];
            const isBusiness = audience.customerType === 'business';
            return (
              <article
                key={audience.id}
                id={audience.id}
                className={`scroll-mt-24 rounded-2xl border p-7 sm:p-9 ${
                  isBusiness
                    ? 'border-brand-navy/15 bg-brand-navy text-white'
                    : 'border-brand-line bg-brand-mist'
                }`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    isBusiness ? 'bg-white/10 text-brand-aqua' : 'bg-brand-aqua text-brand-blue'
                  }`}
                >
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h3 className={`mt-4 text-2xl font-bold ${isBusiness ? 'text-white' : 'text-brand-navy'}`}>
                  {audience.title}
                </h3>
                <p className={`mt-2 text-[15px] leading-relaxed ${isBusiness ? 'text-white/80' : 'text-brand-ink'}`}>
                  {audience.copy}
                </p>
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {audience.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className={`flex items-start gap-2 text-[15px] font-medium ${
                        isBusiness ? 'text-white/90' : 'text-brand-navy'
                      }`}
                    >
                      <Check
                        size={17}
                        className={`mt-0.5 shrink-0 ${isBusiness ? 'text-brand-aqua' : 'text-brand-green'}`}
                        aria-hidden="true"
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>
                <FlowCtaButton
                  customerType={audience.customerType}
                  className={`mt-7 inline-flex min-h-11 items-center justify-center rounded-xl px-6 py-3 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isBusiness
                      ? 'bg-brand-blue text-white hover:bg-brand-bluedark focus-visible:outline-white'
                      : 'bg-brand-navy text-white hover:bg-brand-deep focus-visible:outline-brand-blue'
                  }`}
                >
                  {audience.cta}
                </FlowCtaButton>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
