'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { faqCopy, faqs } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

/**
 * Accessible FAQ accordion: native buttons with aria-expanded/aria-controls,
 * fully keyboard operable, content from the typed marketing-content file.
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-16 md:py-24">
      <div className={`${container} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
        <div>
          <p className={sectionEyebrow}>{faqCopy.eyebrow}</p>
          <h2 className={sectionHeading}>{faqCopy.heading}</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-brand-ink">
            {faqCopy.supporting}
          </p>
        </div>
        <div className="divide-y divide-brand-line border-y border-brand-line">
          {faqs.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.question}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex min-h-11 w-full items-center justify-between gap-4 py-4 text-left text-[17px] font-semibold text-brand-navy transition-colors hover:text-brand-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                  >
                    {faq.question}
                    <ChevronDown
                      size={20}
                      aria-hidden="true"
                      className={`shrink-0 text-brand-blue transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-button-${index}`}
                  hidden={!open}
                  className="pb-5"
                >
                  <p className="max-w-2xl text-[15px] leading-relaxed text-brand-ink">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
