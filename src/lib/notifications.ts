import { addDays, differenceInDays, format } from 'date-fns';
import { getAppUrl } from './env';
import { prisma } from './prisma';
import { sendEmail, sendSms } from './email';
import { money } from './format';

export interface AutomationResult {
  deliveryReminders: number;
  paymentReminders: number;
  overdueFlagged: number;
  suspended: number;
  loyaltyMessages: number;
  ownerSummarySent: boolean;
}

/**
 * The daily automation pass. Safe to run repeatedly — each step is
 * idempotent for the day (reminders key off exact day offsets, suspension
 * checks current status first).
 */
export async function runDailyAutomation(now = new Date()): Promise<AutomationResult> {
  const result: AutomationResult = {
    deliveryReminders: 0,
    paymentReminders: 0,
    overdueFlagged: 0,
    suspended: 0,
    loyaltyMessages: 0,
    ownerSummarySent: false,
  };
  const config = await prisma.pricingConfig.findUnique({ where: { id: 'default' } });

  // ── 1. Delivery reminders for tomorrow ────────────────────────────────────
  const tomorrowStart = new Date(format(addDays(now, 1), 'yyyy-MM-dd') + 'T00:00:00');
  const tomorrowEnd = new Date(format(addDays(now, 1), 'yyyy-MM-dd') + 'T23:59:59');
  const tomorrowOrders = await prisma.order.findMany({
    where: { deliveryDate: { gte: tomorrowStart, lte: tomorrowEnd }, status: 'SCHEDULED' },
    include: { customer: true },
  });
  for (const o of tomorrowOrders) {
    const c = o.customer;
    const already = await prisma.notificationLog.findFirst({
      where: {
        customerId: c.id,
        type: 'DELIVERY_REMINDER',
        createdAt: { gte: new Date(format(now, 'yyyy-MM-dd') + 'T00:00:00') },
      },
    });
    if (already) continue;
    const msg = `Hi ${c.name.split(' ')[0]}! Garden State Water here — your water delivery is scheduled for tomorrow. Please leave your empty jugs out. Total: ${money(o.total)}. Reply if you need to reschedule.`;
    if (c.phone) {
      await sendSms({ to: c.phone, body: msg, type: 'DELIVERY_REMINDER', customerId: c.id, fallbackEmail: c.email });
      result.deliveryReminders++;
    } else if (c.email) {
      await sendEmail({ to: c.email, subject: 'Your water delivery is tomorrow 💧', body: msg, type: 'DELIVERY_REMINDER', customerId: c.id });
      result.deliveryReminders++;
    }
  }

  // ── 2. Flag overdue invoices + remind at 7/14/30 days ─────────────────────
  // A week of grace: invoices flip to OVERDUE once they're 7+ days past due.
  const OVERDUE_GRACE_DAYS = 7;
  const flagged = await prisma.invoice.updateMany({
    where: {
      status: { in: ['SENT', 'PARTIALLY_PAID'] },
      dueDate: { lt: addDays(now, -OVERDUE_GRACE_DAYS) },
    },
    data: { status: 'OVERDUE' },
  });
  result.overdueFlagged = flagged.count;

  const overdueInvoices = await prisma.invoice.findMany({
    where: { status: 'OVERDUE' },
    include: { customer: true },
  });
  for (const inv of overdueInvoices) {
    const daysLate = differenceInDays(now, inv.dueDate);
    if (![7, 14, 30].includes(daysLate)) continue;
    if (!inv.customer.email) continue;
    const due = inv.total - inv.amountPaid;
    const appUrl = getAppUrl();
    await sendEmail({
      to: inv.customer.email,
      subject: `Reminder: invoice #${inv.number} is ${daysLate} days past due (${money(due)})`,
      body: `Hi ${inv.customer.name},\n\nInvoice #${inv.number} for ${money(due)} is now ${daysLate} days past due. You can pay online or settle up at your next delivery.\n\nPay: ${appUrl}/api/pay/${inv.id}\n\nThank you!`,
      type: 'PAYMENT_REMINDER',
      customerId: inv.customerId,
    });
    result.paymentReminders++;
  }

  // ── 3. Auto-suspend accounts overdue past the configured limit ────────────
  if (config?.autoSuspendEnabled) {
    const suspendDays = config.overdueSuspendDays;
    const cutoff = addDays(now, -suspendDays);
    const delinquent = await prisma.invoice.findMany({
      where: { status: 'OVERDUE', dueDate: { lt: cutoff } },
      include: { customer: true },
      distinct: ['customerId'],
    });
    for (const inv of delinquent) {
      if (inv.customer.status !== 'ACTIVE') continue;
      await prisma.customer.update({
        where: { id: inv.customerId },
        data: {
          status: 'SUSPENDED',
          suspendedAt: now,
          suspensionNote: `Auto-suspended: invoice #${inv.number} overdue ${suspendDays}+ days`,
        },
      });
      await prisma.commLog.create({
        data: {
          customerId: inv.customerId,
          channel: 'NOTE',
          note: `Auto-suspended for non-payment (invoice #${inv.number}). Reactivate from the profile to override.`,
        },
      });
      result.suspended++;
    }
  }

  // ── 4. Loyalty & birthday messages ────────────────────────────────────────
  if (config?.loyaltyEnabled) {
    const todayKey = format(now, 'MM-dd');
    const customers = await prisma.customer.findMany({
      where: { status: 'ACTIVE', email: { not: null } },
    });
    for (const c of customers) {
      const isBirthday = c.birthday && format(c.birthday, 'MM-dd') === todayKey;
      const monthsIn = differenceInDays(now, c.startedAt) / 30.44;
      const isAnniversary =
        format(c.startedAt, 'MM-dd') === todayKey && monthsIn >= config.loyaltyMonths;
      if (!isBirthday && !isAnniversary) continue;
      const already = await prisma.notificationLog.findFirst({
        where: {
          customerId: c.id,
          type: 'LOYALTY',
          createdAt: { gte: new Date(format(now, 'yyyy-MM-dd') + 'T00:00:00') },
        },
      });
      if (already) continue;
      await sendEmail({
        to: c.email!,
        subject: isBirthday ? '🎂 Happy birthday from Garden State Water!' : '💙 Thanks for being with us!',
        body: isBirthday
          ? `Happy birthday, ${c.name.split(' ')[0]}! Thanks for letting us keep you hydrated — your next jug is on us. Just mention this email on your next delivery.`
          : `${c.name.split(' ')[0]}, it's been ${Math.floor(monthsIn / 12) || 1}+ year(s) since your first delivery. Thank you for sticking with a local business — your loyalty means everything!`,
        type: 'LOYALTY',
        customerId: c.id,
      });
      result.loyaltyMessages++;
    }
  }

  // ── 5. Owner morning summary ──────────────────────────────────────────────
  const ownerEmail = process.env.OWNER_EMAIL;
  if (ownerEmail) {
    const todayStart = new Date(format(now, 'yyyy-MM-dd') + 'T00:00:00');
    const todayEnd = new Date(format(now, 'yyyy-MM-dd') + 'T23:59:59');
    const [todays, outstandingAgg] = await Promise.all([
      prisma.order.findMany({
        where: { deliveryDate: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } },
        include: { customer: true, items: true },
      }),
      prisma.invoice.aggregate({
        where: { status: { in: ['OVERDUE', 'PARTIALLY_PAID', 'SENT'] } },
        _sum: { total: true, amountPaid: true },
      }),
    ]);
    const expected = todays.reduce((s, o) => s + o.total, 0);
    const jugs = todays.reduce(
      (s, o) => s + o.items.filter((i) => i.productType === 'JUG_REFILL').reduce((x, i) => x + i.quantity, 0),
      0
    );
    const outstanding = (outstandingAgg._sum.total ?? 0) - (outstandingAgg._sum.amountPaid ?? 0);
    const appUrl = getAppUrl();
    await sendEmail({
      to: ownerEmail,
      subject: `☀️ Today: ${todays.length} deliveries, ${money(expected)} expected`,
      body: `Good morning!\n\nToday's plan:\n• ${todays.length} deliveries (${jugs} jugs)\n• ${money(expected)} expected revenue\n• ${money(outstanding)} outstanding across open invoices\n\nStops:\n${todays.map((o) => `  – ${o.customer.name}: ${o.items.map((i) => i.description ?? i.productType).join(', ')}`).join('\n') || '  (none scheduled)'}\n\nDelivery sheet: ${appUrl}/orders/delivery-sheet\nBuild route: ${appUrl}/routes`,
      type: 'OWNER_DAILY_SUMMARY',
    });
    result.ownerSummarySent = true;
  }

  return result;
}
