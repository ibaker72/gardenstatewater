/**
 * Central public-site configuration.
 *
 * Everything business-sensitive that is NOT yet confirmed (pricing, delivery
 * days, fees, water source, service areas) is deliberately absent — the page
 * must not invent operational claims. Contact details live in the
 * database-backed settings row (PricingConfig, editable from /settings); this
 * file holds the launch-stage feature flags and static navigation.
 *
 * Safe to import from client components: no secrets, no server-only modules.
 */

export interface SiteNavLink {
  label: string;
  href: string;
}

export const siteConfig = {
  businessName: 'Garden State Water',

  /** Launch-stage behavior: shows the announcement bar + early-customer copy. */
  launchMode: true,

  /** Prices are confirmed per-address for now — never rendered publicly. */
  showPublicPricing: false,

  /**
   * Zone names come from owner-configured data, but the current zone list
   * predates the final business model, so the public area list stays hidden
   * until the owner confirms it. The ZIP checker still answers from the same
   * data without naming routes.
   */
  showServiceAreaNames: false,

  homeDeliveryEnabled: true,
  businessDeliveryEnabled: true,
  foundingCustomerProgramEnabled: true,

  serviceAreaMessage: 'Now accepting early customers in select North Jersey communities.',

  customerPortalPath: '/portal',
  /** Owner access stays reachable, but only through the discreet footer link. */
  ownerLoginPath: '/login',

  /** No verified social profiles yet — the footer hides what isn't configured. */
  social: {} as Partial<Record<'facebook' | 'instagram' | 'google', string>>,

  navLinks: [
    { label: 'Home Delivery', href: '#home-delivery' },
    { label: 'Business Delivery', href: '#business-delivery' },
    { label: 'Dispensers', href: '#dispensers' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Service Area', href: '#service-area' },
    { label: 'FAQs', href: '#faq' },
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
