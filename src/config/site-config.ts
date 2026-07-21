/**
 * Central public-site configuration.
 *
 * Contact details live in the database-backed settings row (PricingConfig,
 * editable from /settings); prices come from `site_plans` + `pricing_config`;
 * the serviceable-area list comes from `service_zips`. This file holds only
 * static navigation and feature flags.
 *
 * Safe to import from client components: no secrets, no server-only modules.
 */

export interface SiteNavLink {
  label: string;
  href: string;
}

export const siteConfig = {
  businessName: 'Garden State Water',
  tagline: 'NJ & NY spring water delivery',

  /** Public pricing launched in Phase 4 — plans + prices render from the DB. */
  showPublicPricing: true,

  customerPortalPath: '/portal',
  /** Owner access stays reachable, but only through the discreet footer link. */
  ownerLoginPath: '/login',
  signupPath: '/signup',

  /** No verified social profiles yet — the footer hides what isn't configured. */
  social: {} as Partial<Record<'facebook' | 'instagram' | 'google', string>>,

  navLinks: [
    { label: 'Plans & Pricing', href: '/#pricing' },
    { label: 'Service Area', href: '/#service-area' },
    { label: 'Deals', href: '/#deals' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Why Us', href: '/#why-us' },
    { label: 'FAQs', href: '/#faq' },
  ] satisfies SiteNavLink[],
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * A phone number safe to show customers, or null.
 *
 * Numbers in the reserved fictional 555 exchange (the classic placeholder
 * "(908) 555-0100") are treated as unconfigured — the site hides the phone
 * entirely rather than publishing a fake one.
 */
export function publicPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.slice(-7, -4) === '555') return null;
  return trimmed;
}

/** A support email safe to show customers, or null. */
export function publicEmail(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}
