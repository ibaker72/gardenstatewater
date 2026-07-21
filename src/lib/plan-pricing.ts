/**
 * Public plan pricing math — pure and unit-testable, shared by the pricing
 * table (client), the signup flow, and Stripe checkout (server), so every
 * surface shows the same numbers.
 */

/** Subscriptions deliver weekly: a month of service is 4 deliveries. */
export const DELIVERIES_PER_MONTH = 4;

/** Round to cents without float drift (69 * 11 = 758.999… → 759). */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** "Pay yearly, get N months free" → the yearly charge in dollars. */
export function annualPrice(monthlyPrice: number, freeMonths: number): number {
  const billedMonths = Math.max(1, 12 - Math.max(0, Math.round(freeMonths)));
  return toCents(monthlyPrice * billedMonths) / 100;
}

/** The effective per-month cost under annual billing (shown under the toggle). */
export function annualMonthlyEquivalent(monthlyPrice: number, freeMonths: number): number {
  return Math.round((annualPrice(monthlyPrice, freeMonths) / 12) * 100) / 100;
}

/** Per-jug cost of a subscription tier ("works out to $9.75/jug"). */
export function perJugPrice(monthlyPrice: number, jugsPerMonth: number): number {
  if (jugsPerMonth <= 0) return monthlyPrice;
  return Math.round((monthlyPrice / jugsPerMonth) * 100) / 100;
}

/**
 * The "first delivery X% off" discount in cents for a subscription tier: one
 * delivery is a month's price over the month's deliveries, and the discount
 * comes off that first delivery only.
 */
export function firstDeliveryDiscountCents(monthlyPrice: number, discountPct: number): number {
  const perDelivery = monthlyPrice / DELIVERIES_PER_MONTH;
  const cents = toCents(perDelivery * (discountPct / 100));
  return Math.max(0, cents);
}

/** $12.5 → "$12.50", 39 → "$39" (marketing pages drop needless cents). */
export function displayPrice(dollars: number): string {
  const rounded = Math.round(dollars * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}
