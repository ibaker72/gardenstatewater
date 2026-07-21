import type { SubscriptionPlan } from '@prisma/client';
import { DELIVERIES_PER_MONTH } from './plan-pricing';

/**
 * Pure signup helpers — mapping public tiers onto the operational CRM fields
 * and picking the first delivery date. Unit-tested, no I/O.
 */

export interface CrmPlanFields {
  plan: SubscriptionPlan;
  /** Jugs per scheduled delivery (subscriptions deliver weekly). */
  planJugs: number;
}

/** Map a public tier onto the CRM's subscription fields. */
export function planToCrmFields(
  tier: { isSubscription: boolean; jugsPerMonth: number },
  oneTimeJugs?: number
): CrmPlanFields {
  if (!tier.isSubscription) {
    return { plan: 'ON_DEMAND', planJugs: Math.max(1, oneTimeJugs ?? 2) };
  }
  return {
    plan: 'WEEKLY',
    planJugs: Math.max(1, Math.ceil(tier.jugsPerMonth / DELIVERIES_PER_MONTH)),
  };
}

/**
 * First delivery date: the next occurrence of the preferred weekday that is
 * at least `minDaysOut` away (deliveries need a day of routing lead time);
 * with no preference, simply `minDaysOut` days from now.
 */
export function nextDeliveryDate(
  preferredDay: number | null | undefined,
  from = new Date(),
  minDaysOut = 2
): Date {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + minDaysOut);
  if (preferredDay === null || preferredDay === undefined || preferredDay < 0 || preferredDay > 6) {
    return start;
  }
  const offset = (preferredDay - start.getDay() + 7) % 7;
  start.setDate(start.getDate() + offset);
  return start;
}
