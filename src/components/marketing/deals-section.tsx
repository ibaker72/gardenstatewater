import { BadgePercent, Gift, Tag } from 'lucide-react';
import type { PublicDeal } from '@/lib/marketing';
import { dealsCopy } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

const ICONS = [BadgePercent, Gift, Tag];

/**
 * Current offers, straight from the owner-managed `deals` table
 * (Settings → Website). The section hides itself when no offers are active.
 */
export function DealsSection({ deals }: { deals: PublicDeal[] }) {
  if (deals.length === 0) return null;
  return (
    <section id="deals" className="scroll-mt-24 bg-white py-16 md:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>{dealsCopy.eyebrow}</p>
          <h2 className={sectionHeading}>{dealsCopy.heading}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-ink sm:text-lg">
            {dealsCopy.supporting}
          </p>
        </div>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {deals.map((deal, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <li
                key={deal.title}
                className="flex flex-col rounded-2xl border border-brand-line bg-brand-mist p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-aqua text-brand-blue">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  {deal.badge && (
                    <span className="rounded-full bg-brand-navy px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      {deal.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold text-brand-navy">{deal.title}</h3>
                {deal.description && (
                  <p className="mt-2 text-[15px] leading-relaxed text-brand-ink">{deal.description}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
