import { CalendarCheck2, ListChecks, Recycle } from 'lucide-react';
import { howItWorks } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

const STEP_ICONS = [ListChecks, CalendarCheck2, Recycle];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-brand-mist py-16 md:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>How it works</p>
          <h2 className={sectionHeading}>{howItWorks.heading}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-ink sm:text-lg">
            {howItWorks.supporting}
          </p>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {howItWorks.steps.map((step, index) => {
            const Icon = STEP_ICONS[index % STEP_ICONS.length];
            return (
              <li key={step.title} className="relative rounded-2xl border border-brand-line bg-white p-6 pt-8">
                <span
                  aria-hidden="true"
                  className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white"
                >
                  {index + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-aqua text-brand-blue">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-brand-navy">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-brand-ink">{step.copy}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
