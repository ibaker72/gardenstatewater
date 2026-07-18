import { Building2, CalendarPlus, Package, RefreshCw, Refrigerator, Coffee } from 'lucide-react';
import { deliveryOptions, type Offering } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

const ICONS: Record<Offering['icon'], typeof Package> = {
  exchange: RefreshCw,
  setup: Package,
  bottomLoad: Refrigerator,
  countertop: Coffee,
  office: Building2,
  bulk: CalendarPlus,
};

/** Offerings without unconfirmed pricing — availability confirmed per address. */
export function DeliveryOptions() {
  const offerings = deliveryOptions.offerings.filter((o) => o.enabled);
  return (
    <section id="dispensers" className="scroll-mt-24 bg-white py-16 md:py-24">
      <div className={container}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className={sectionEyebrow}>Bottles &amp; dispensers</p>
            <h2 className={sectionHeading}>{deliveryOptions.heading}</h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-brand-ink md:text-right">
            {deliveryOptions.note}
          </p>
        </div>
        <ul className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((offering) => {
            const Icon = ICONS[offering.icon];
            return (
              <li key={offering.id} className="flex gap-4 border-t border-brand-line pt-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-aqua text-brand-blue">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold text-brand-navy">{offering.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-brand-ink">{offering.copy}</p>
                  <a
                    href="#request-service"
                    className="mt-2 inline-block rounded text-sm font-semibold text-brand-blue underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                  >
                    Ask about availability
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
