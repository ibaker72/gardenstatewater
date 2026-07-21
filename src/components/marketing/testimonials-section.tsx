import { Quote } from 'lucide-react';
import type { PublicTestimonial } from '@/lib/marketing';
import { testimonialsCopy } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

/**
 * Customer quotes curated in Settings. Until real ones exist, clearly-labeled
 * example cards keep the section designed without faking social proof.
 */
export function TestimonialsSection({ testimonials }: { testimonials: PublicTestimonial[] }) {
  if (testimonials.length === 0) return null;
  const showingExamples = testimonials.some((t) => t.example);

  return (
    <section id="testimonials" className="scroll-mt-24 bg-brand-mist py-16 md:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>{testimonialsCopy.eyebrow}</p>
          <h2 className={sectionHeading}>{testimonialsCopy.heading}</h2>
        </div>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li key={testimonial.name} className="relative flex flex-col rounded-2xl border border-brand-line bg-white p-6">
              {testimonial.example && (
                <span className="absolute right-4 top-4 rounded-full border border-brand-line bg-brand-mist px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-ink">
                  Example
                </span>
              )}
              <Quote size={26} className="text-brand-blue/40" aria-hidden="true" />
              <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-brand-navy">
                “{testimonial.quote}”
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-brand-ink">— {testimonial.name}</p>
            </li>
          ))}
        </ul>
        {showingExamples && (
          <p className="mt-5 text-center text-sm text-brand-ink">{testimonialsCopy.exampleNote}</p>
        )}
      </div>
    </section>
  );
}
