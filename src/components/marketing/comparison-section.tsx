import { Check, X } from 'lucide-react';
import { comparison } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';

/**
 * The "$6.99 supermarket jug" objection, handled head-on: what the exchange
 * rack really costs versus delivery.
 */
export function ComparisonSection() {
  return (
    <section id="why-us" className="scroll-mt-24 bg-white py-16 md:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>{comparison.eyebrow}</p>
          <h2 className={sectionHeading}>{comparison.heading}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-ink sm:text-lg">
            {comparison.supporting}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th scope="col" className="w-[34%] pb-3" aria-label="Comparison category" />
                <th scope="col" className="w-[33%] rounded-t-2xl bg-brand-mist px-5 py-4 text-[15px] font-semibold text-brand-ink">
                  {comparison.theirLabel}
                </th>
                <th scope="col" className="w-[33%] rounded-t-2xl border-x-2 border-t-2 border-brand-blue bg-brand-aqua px-5 py-4 text-[15px] font-bold text-brand-navy">
                  {comparison.oursLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row, index) => {
                const last = index === comparison.rows.length - 1;
                return (
                  <tr key={row.label}>
                    <th scope="row" className="border-t border-brand-line py-4 pr-4 text-[15px] font-semibold text-brand-navy">
                      {row.label}
                    </th>
                    <td className={`bg-brand-mist px-5 py-4 text-[15px] text-brand-ink ${last ? 'rounded-b-2xl' : ''}`}>
                      <span className="flex items-start gap-2">
                        <X size={17} className="mt-0.5 shrink-0 text-brand-ink/50" aria-hidden="true" />
                        {row.theirs}
                      </span>
                    </td>
                    <td
                      className={`border-x-2 border-brand-blue bg-brand-aqua px-5 py-4 text-[15px] font-medium text-brand-navy ${
                        last ? 'rounded-b-2xl border-b-2' : ''
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <Check size={17} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />
                        {row.ours}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
