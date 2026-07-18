import { container, btnOnDark, btnGhostOnDark } from './styles';
import { finalCta } from '@/config/marketing-content';
import { FlowCtaButton } from './flow-cta-button';

/** High-contrast closing conversion section. */
export function FinalCta() {
  return (
    <section className="bg-brand-deep py-16 text-white md:py-20">
      <div className={`${container} flex flex-col items-center text-center`}>
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">{finalCta.heading}</h2>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">{finalCta.copy}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#availability" className={btnOnDark}>
            {finalCta.primaryCta}
          </a>
          <FlowCtaButton customerType="business" className={btnGhostOnDark}>
            {finalCta.secondaryCta}
          </FlowCtaButton>
        </div>
      </div>
    </section>
  );
}
