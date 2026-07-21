import { Star } from 'lucide-react';
import { hero } from '@/config/marketing-content';
import { siteConfig } from '@/config/site-config';
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
          <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight text-brand-navy sm:text-5xl lg:text-[3.4rem]">
            {hero.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-ink">{hero.subhead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={siteConfig.signupPath} className={btnPrimary}>
              {hero.primaryCta}
            </a>
            <a href="/#pricing" className={btnSecondary}>
              {hero.secondaryCta}
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] font-medium text-brand-navy">
            <span className="flex items-center gap-0.5 text-amber-500" aria-label="Five star service">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              ))}
            </span>
            {hero.trustStrip.map((point, i) => (
              <span key={point} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden="true" className="text-brand-line">·</span>}
                {point}
              </span>
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-md md:max-w-none">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}
