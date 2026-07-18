import { siteConfig } from '@/config/site-config';

/** Narrow launch-stage strip above the header. Hidden when launchMode is off. */
export function AnnouncementBar() {
  if (!siteConfig.launchMode) return null;
  return (
    <div className="bg-brand-navy text-white">
      <div className="mx-auto flex w-full max-w-site flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2 text-center text-sm sm:px-8">
        <p>{siteConfig.serviceAreaMessage}</p>
        <a
          href="#availability"
          className="rounded font-semibold text-brand-aqua underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Check availability
        </a>
      </div>
    </div>
  );
}
