import { howItWorks } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

/** Connected three-step process — numbered, with a linking line, not floating cards. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-brand-mist py-16 md:py-24">
      <div className={container}>
        <div className="max-w-2xl">
          <p className={sectionEyebrow}>How it works</p>
          <h2 className={sectionHeading}>{howItWorks.heading}</h2>
        </div>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {howItWorks.steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-5 md:block">
              {/* connector: vertical on mobile, horizontal on desktop */}
              {index < howItWorks.steps.length - 1 && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute left-6 top-14 h-[calc(100%-8px)] w-px -translate-x-1/2 bg-brand-line md:hidden"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-[4.5rem] top-6 hidden h-px w-[calc(100%-3.5rem)] bg-brand-line md:block"
                  />
                </>
              )}
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-brand-blue bg-white text-lg font-bold text-brand-blue">
                {index + 1}
              </span>
              <div className="md:mt-5">
                <h3 className="text-lg font-bold text-brand-navy">{step.title}</h3>
                <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-brand-ink">{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
