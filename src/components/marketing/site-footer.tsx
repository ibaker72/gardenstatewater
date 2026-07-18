import { Droplets, Mail, Phone } from 'lucide-react';
import { siteConfig } from '@/config/site-config';

/**
 * Footer with real, configured contact details only — unconfigured fields are
 * hidden, never replaced with placeholders. Owner access stays discreet.
 */
export function SiteFooter({
  supportEmail,
  supportPhone,
}: {
  supportEmail: string | null;
  supportPhone: string | null;
}) {
  const year = new Date().getFullYear();
  const footerLink =
    'rounded text-[15px] text-white/75 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

  return (
    <footer className="bg-brand-navy text-white">
      <div className="mx-auto grid w-full max-w-site gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue">
              <Droplets size={22} className="text-white" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold">{siteConfig.businessName}</span>
          </div>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/70">
            5-gallon water delivery for North Jersey homes and businesses — recurring bottle
            exchange, dispenser options, and personal onboarding for every route.
          </p>
        </div>

        <nav aria-label="Delivery">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Delivery</h2>
          <ul className="mt-4 space-y-2.5">
            <li><a href="#home-delivery" className={footerLink}>Home Delivery</a></li>
            <li><a href="#business-delivery" className={footerLink}>Business Delivery</a></li>
            <li><a href="#service-area" className={footerLink}>Service Area</a></li>
            <li><a href="#faq" className={footerLink}>FAQs</a></li>
          </ul>
        </nav>

        <nav aria-label="Customers">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Customers</h2>
          <ul className="mt-4 space-y-2.5">
            <li><a href={siteConfig.customerPortalPath} className={footerLink}>Customer Login</a></li>
            <li><a href="#availability" className={footerLink}>Check Availability</a></li>
            <li><a href="/privacy" className={footerLink}>Privacy Policy</a></li>
            <li><a href="/terms" className={footerLink}>Terms of Service</a></li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Contact</h2>
          <ul className="mt-4 space-y-2.5">
            {supportEmail && (
              <li>
                <a href={`mailto:${supportEmail}`} className={`${footerLink} inline-flex items-center gap-2`}>
                  <Mail size={16} aria-hidden="true" /> {supportEmail}
                </a>
              </li>
            )}
            {supportPhone && (
              <li>
                <a
                  href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`}
                  className={`${footerLink} inline-flex items-center gap-2`}
                >
                  <Phone size={16} aria-hidden="true" /> {supportPhone}
                </a>
              </li>
            )}
            {!supportEmail && !supportPhone && (
              <li className="text-[15px] text-white/60">Contact details coming soon.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-site flex-col items-center justify-between gap-2 px-5 py-5 text-sm text-white/50 sm:flex-row sm:px-8">
          <p>© {year} {siteConfig.businessName}. All rights reserved.</p>
          <a
            href={siteConfig.ownerLoginPath}
            className="rounded text-xs text-white/35 transition-colors hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            Owner access
          </a>
        </div>
      </div>
    </footer>
  );
}
