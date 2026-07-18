/**
 * Public service-area status resolution — pure logic, unit-testable.
 *
 * Deliberately returns only a coarse public status. Route names, delivery
 * days, fees, and customer data never leave the server through this path.
 */

export type ServiceAreaStatus = 'active' | 'upcoming' | 'unavailable' | 'manual_review';

export interface PublicAreaCheck {
  status: ServiceAreaStatus;
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
 * - Otherwise → 'unavailable' (the visitor can still join the expansion list).
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
