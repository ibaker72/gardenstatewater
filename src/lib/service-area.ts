/**
 * Public service-area status resolution — pure logic, unit-testable.
 *
 * Deliberately returns only coarse public data (status + town name). Route
 * names, delivery days, fees, and customer data never leave the server
 * through this path.
 */

export type ServiceAreaStatus = 'active' | 'upcoming' | 'unavailable' | 'manual_review';

export interface PublicAreaCheck {
  status: ServiceAreaStatus;
  /** Town name for the matched ZIP ("Great news! We deliver to Morristown."). */
  town?: string;
  state?: string;
}

export const ZIP_RE = /^\d{5}$/;

/** Normalize raw user input to a 5-digit ZIP, or null when invalid. */
export function normalizeZip(raw: string | null | undefined): string | null {
  const zip = raw?.trim() ?? '';
  return ZIP_RE.test(zip) ? zip : null;
}

/**
 * Resolve a ZIP against configured zone ZIP lists.
 *
 * - No zones configured at all → 'manual_review' (launch stage: every address
 *   is confirmed personally).
 * - ZIP present in a zone → 'active'.
 * - Otherwise → 'unavailable' (the visitor can still join the waitlist).
 *
 * 'upcoming' is reserved for when zones grow a launch-date concept; the UI
 * already handles it.
 */
export function resolveServiceAreaStatus(
  zip: string,
  zoneZipLists: string[][]
): ServiceAreaStatus {
  if (zoneZipLists.length === 0) return 'manual_review';
  const inZone = zoneZipLists.some((zips) => zips.includes(zip));
  return inZone ? 'active' : 'unavailable';
}

export interface ServiceZipRow {
  zip: string;
  town: string;
  state: string;
  active: boolean;
}

/**
 * Resolve a ZIP against the owner-managed serviceable-ZIP list, falling back
 * to operational zone ZIPs (an address already on a route is always
 * serviceable even if the marketing list forgot it).
 *
 * `anyZipsConfigured` says whether ANY active serviceable ZIP exists at all:
 * with neither list configured, every check degrades to 'manual_review' so a
 * fresh install never tells a visitor "no".
 */
export function resolvePublicArea(
  zip: string,
  match: ServiceZipRow | null,
  zoneZipLists: string[][],
  anyZipsConfigured: boolean
): PublicAreaCheck {
  if (match && match.zip === zip && match.active) {
    return { status: 'active', town: match.town, state: match.state };
  }

  if (zoneZipLists.some((zips) => zips.includes(zip))) return { status: 'active' };

  return { status: anyZipsConfigured || zoneZipLists.length > 0 ? 'unavailable' : 'manual_review' };
}
