import { CalendarClock, MapPinned, MessagesSquare, Recycle, UserRound, Users } from 'lucide-react';
import { benefits } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

const ICONS = [MapPinned, CalendarClock, Users, Recycle, UserRound, MessagesSquare];

/** Credibility section — only claims the business can actually stand behind. */
export function BenefitsSection() {
  return (
    <section className="bg-brand-navy py-16 text-white md:py-24">
      <div className={container}>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-aqua">
            Why Garden State Water
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{benefits.heading}</h2>
        </div>
        <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.items.map((item, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <li key={item.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-brand-aqua">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="mt-3.5 text-[17px] font-bold">{item.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-white/75">{item.copy}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
