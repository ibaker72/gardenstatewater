import type { PublicDeal } from '@/lib/marketing';

/**
 * Seasonal banner strip above the header — the first active `deals` row with
 * slot "banner", editable from Settings → Website. Hidden when none is active.
 */
export function AnnouncementBar({ banner }: { banner: PublicDeal | null }) {
  if (!banner) return null;
  return (
    <div className="bg-brand-navy text-white">
      <div className="mx-auto flex w-full max-w-site flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2 text-center text-sm sm:px-8">
        <p>
          {banner.badge && (
            <span className="mr-2 rounded-full bg-brand-blue px-2 py-0.5 text-xs font-bold uppercase tracking-wide">
              {banner.badge}
            </span>
          )}
          {banner.title}
        </p>
        <a
          href="/#service-area"
          className="rounded font-semibold text-brand-aqua underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Check your ZIP
        </a>
      </div>
    </div>
  );
}
