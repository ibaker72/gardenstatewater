import { CheckCircle2 } from 'lucide-react';
import { hero } from '@/config/marketing-content';
import { btnPrimary, btnSecondary, container } from './styles';
import { HeroArt } from './hero-art';

export function HeroSection() {
  return (
    <section className="bg-brand-mist">
      <div className={`${container} grid items-center gap-10 pb-16 pt-12 md:grid-cols-[1.05fr_0.95fr] md:pb-24 md:pt-16 lg:gap-14`}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">
            {hero.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-brand-navy sm:text-5xl lg:text-[3.4rem]">
            {hero.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-ink">
            {hero.supporting}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#availability" className={btnPrimary}>
              {hero.primaryCta}
            </a>
            <a href="#dispensers" className={btnSecondary}>
              {hero.secondaryCta}
            </a>
          </div>
          <ul className="mt-8 flex flex-col gap-x-6 gap-y-2.5 sm:flex-row sm:flex-wrap">
            {hero.trustPoints.map((point) => (
              <li key={point.label} className="flex items-center gap-2 text-[15px] font-medium text-brand-navy">
                <CheckCircle2 size={18} className="shrink-0 text-brand-green" aria-hidden="true" />
                {point.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto w-full max-w-md md:max-w-none">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}
