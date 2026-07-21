import { MapPin } from 'lucide-react';
import type { RegionGroup } from '@/lib/marketing';
import { serviceAreaCopy } from '@/config/marketing-content';
import { container, sectionEyebrow, sectionHeading } from './styles';
import { ZipChecker } from './zip-checker';

/**
 * The interactive service-area section: ZIP checker + waitlist up top, the
 * full NY–NJ region grid below. Region data comes from the owner-managed
 * `service_zips` table; each town links to its local landing page.
 */
export function ServiceAreaSection({ regions }: { regions: RegionGroup[] }) {
  const njRegions = regions.filter((r) => r.state === 'NJ');
  const nyRegions = regions.filter((r) => r.state === 'NY');

  return (
    <section id="service-area" className="scroll-mt-24 bg-brand-mist py-16 md:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={sectionEyebrow}>{serviceAreaCopy.eyebrow}</p>
          <h2 className={sectionHeading}>{serviceAreaCopy.heading}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-brand-ink sm:text-lg">
            {serviceAreaCopy.supporting}
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl">
          <ZipChecker />
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <StateColumn label="New Jersey" regions={njRegions} />
          <StateColumn label="New York" regions={nyRegions} />
        </div>
      </div>
    </section>
  );
}

function StateColumn({ label, regions }: { label: string; regions: RegionGroup[] }) {
  if (regions.length === 0) return null;
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
        <MapPin size={18} className="text-brand-blue" aria-hidden="true" />
        {label}
      </h3>
      <div className="mt-4 space-y-5">
        {regions.map((region) => (
          <div key={region.region} className="rounded-2xl border border-brand-line bg-white p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-brand-blue">
              {region.region}
            </h4>
            <ul className="mt-3 flex flex-wrap gap-2">
              {region.towns.map((town) => (
                <li key={town.slug}>
                  <a
                    href={`/water-delivery/${town.slug}`}
                    className="inline-flex items-center rounded-full border border-brand-line bg-brand-mist px-3.5 py-1.5 text-sm font-medium text-brand-navy transition-colors hover:border-brand-blue hover:bg-brand-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                  >
                    {town.town}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
