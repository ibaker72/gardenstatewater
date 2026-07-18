import { MapPin } from 'lucide-react';
import { serviceArea } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading, btnSecondary } from './styles';
import { NewJerseyMap } from './new-jersey-map';

/**
 * Service-area section. `areaNames` comes from owner-configured zone data and
 * is empty until the owner confirms a public list — no invented coverage,
 * days, or fees.
 */
export function ServiceAreaSection({ areaNames }: { areaNames: string[] }) {
  return (
    <section id="service-area" className="scroll-mt-24 bg-white py-16 md:py-24">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]`}>
        <div className="order-2 lg:order-1">
          <div className="rounded-2xl border border-brand-line bg-brand-mist p-8 sm:p-10">
            <NewJerseyMap />
            <p className="mt-4 text-center text-sm text-brand-ink">
              Service focus: North Jersey. Availability is confirmed by ZIP code and route.
            </p>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className={sectionEyebrow}>Service area</p>
          <h2 className={sectionHeading}>{serviceArea.heading}</h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-brand-ink">{serviceArea.supporting}</p>

          {areaNames.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {areaNames.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-1.5 rounded-full border border-brand-line bg-white px-3.5 py-1.5 text-sm font-medium text-brand-navy"
                >
                  <MapPin size={14} className="text-brand-blue" aria-hidden="true" />
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-xl border border-brand-line bg-brand-mist px-4 py-3 text-[15px] font-medium text-brand-navy">
              {serviceArea.noAreasFallback}
            </p>
          )}

          <a href="#availability" className={`${btnSecondary} mt-7`}>
            Check my ZIP code
          </a>
        </div>
      </div>
    </section>
  );
}
