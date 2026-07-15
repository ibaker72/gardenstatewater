import { sendEmail, sendSms } from './email';
import { money, shortDate, WEEKDAYS } from './format';

// Customer-facing notification templates, shared by the admin actions and
// the Stripe webhook. SMS first with email fallback (lib/email handles the
// console fallback in dev). Failures are the sender's to log — none of
// these should ever break the action that triggered them.

interface Reachable {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/** "Your delivery is confirmed for Thursday, Jul 16, 2026." */
export async function notifyDeliveryConfirmed(customer: Reachable, date: Date) {
  const when = `${WEEKDAYS[date.getDay()]}, ${shortDate(date)}`;
  const body = `Your Garden State Water delivery is confirmed for ${when}. Please leave your empty jugs out. Reply if you need to change anything.`;
  if (customer.phone) {
    await sendSms({ to: customer.phone, body, type: 'DELIVERY_REMINDER', customerId: customer.id, fallbackEmail: customer.email });
  } else if (customer.email) {
    await sendEmail({ to: customer.email, subject: 'Your water delivery is confirmed 💧', body, type: 'DELIVERY_REMINDER', customerId: customer.id });
  }
}

/** "You have a new invoice of $X. Pay here: <link>" (SMS nudge with the pay link). */
export async function notifyNewInvoice(
  customer: Reachable,
  invoice: { number: number; dueDate: Date },
  amountDue: number,
  payUrl: string
) {
  if (!customer.phone) return; // the detailed invoice email already went out
  const body = `Garden State Water: you have a new invoice of ${money(amountDue)} (#${invoice.number}), due ${shortDate(invoice.dueDate)}. Pay here: ${payUrl}`;
  await sendSms({ to: customer.phone, body, type: 'INVOICE', customerId: customer.id });
}

/** "Got your payment of $X — thank you!" for manual (cash/Venmo/…) payments. */
export async function notifyPaymentReceived(customer: Reachable, amount: number) {
  const body = `Garden State Water: we received your payment of ${money(amount)} — thank you! 💧`;
  if (customer.phone) {
    await sendSms({ to: customer.phone, body, type: 'OTHER', customerId: customer.id, fallbackEmail: customer.email });
  } else if (customer.email) {
    await sendEmail({ to: customer.email, subject: `Payment received — thank you! (${money(amount)})`, body, type: 'OTHER', customerId: customer.id });
  }
}
