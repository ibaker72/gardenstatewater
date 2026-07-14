import { differenceInCalendarDays, format } from 'date-fns';

export const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const shortDate = (d: Date | string | null | undefined) =>
  d ? format(new Date(d), 'MMM d, yyyy') : '—';

export const dayDate = (d: Date | string | null | undefined) =>
  d ? format(new Date(d), 'EEE, MMM d') : '—';

export const isoDate = (d: Date | string) => format(new Date(d), 'yyyy-MM-dd');

/**
 * The next `count` dates a zone can be delivered to, starting tomorrow.
 * `deliveryDays` uses 0=Sun..6=Sat; an empty list means every day works.
 */
export const upcomingDeliveryDates = (
  deliveryDays: number[],
  count = 14,
  from = new Date()
): Date[] => {
  const dates: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && dates.length < count; i++) {
    cursor.setDate(cursor.getDate() + 1);
    if (deliveryDays.length === 0 || deliveryDays.includes(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
  }
  return dates;
};

/** "today" / "tomorrow" / "Thursday" / "Tue, Aug 4" — customer-friendly dates. */
export const friendlyDay = (d: Date | string): string => {
  const date = new Date(d);
  const days = differenceInCalendarDays(date, new Date());
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) return format(date, 'EEEE');
  return format(date, 'EEE, MMM d');
};

export const timeAgoDays = (d: Date | string | null | undefined) => {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
};

export const PLAN_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  ON_DEMAND: 'On-demand',
};

export const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function fullAddress(c: {
  address: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  return [c.address, c.city, [c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}
