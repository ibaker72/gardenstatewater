'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getConfig, quoteOrder } from '@/lib/pricing';
import { JUG_SKU } from '@/lib/data';
import type { OrderStatus, PaymentMethod } from '@prisma/client';

function num(form: FormData, key: string, fallback = 0): number {
  const n = Number(form.get(key));
  return Number.isFinite(n) ? n : fallback;
}

/** Build the priced item set for an order using the pricing engine. */
async function buildQuote(customerId: string, input: { refillJugs: number; newJugs: number; bottleCases: number; dispenserMonths: number }) {
  const [config, customer] = await Promise.all([
    getConfig(),
    prisma.customer.findUniqueOrThrow({ where: { id: customerId }, include: { zone: true } }),
  ]);
  const quote = quoteOrder(config, {
    ...input,
    plan: customer.plan,
    zoneDeliveryFee: customer.zone ? customer.zone.deliveryFee : null,
  });
  return { quote, customer };
}

export async function createOrder(form: FormData) {
  const customerId = String(form.get('customerId'));
  const deliveryDate = new Date(String(form.get('deliveryDate')));
  const instructions = (form.get('instructions') as string | null)?.trim() || null;

  const { quote } = await buildQuote(customerId, {
    refillJugs: num(form, 'refillJugs'),
    newJugs: num(form, 'newJugs'),
    bottleCases: num(form, 'bottleCases'),
    dispenserMonths: num(form, 'dispenserMonths'),
  });

  const order = await prisma.order.create({
    data: {
      customerId,
      deliveryDate,
      instructions,
      subtotal: quote.subtotal,
      discount: quote.discount,
      deliveryFee: quote.deliveryFee,
      total: quote.total,
      items: {
        create: quote.lines.map((l) => ({
          productType: l.productType,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });

  revalidatePath('/orders');
  revalidatePath('/');
  redirect(`/orders/${order.id}`);
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await prisma.order.update({ where: { id: orderId }, data: { status } });
  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/');
}

/**
 * Deliver one order inside a transaction: moves jugs between stock and the
 * customer's site and records the empties picked up. Shared by the single
 * "mark delivered" flow and the bulk end-of-day action.
 */
async function deliverOrderInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string,
  jugsReturned: number
): Promise<boolean> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });
  if (order.status === 'DELIVERED' || order.status === 'PAID' || order.status === 'CANCELLED') {
    return false;
  }

  const refills = order.items
    .filter((i) => i.productType === 'JUG_REFILL')
    .reduce((s, i) => s + i.quantity, 0);
  const purchased = order.items
    .filter((i) => i.productType === 'JUG_PURCHASE')
    .reduce((s, i) => s + i.quantity, 0);

  await tx.order.update({
    where: { id: orderId },
    data: { status: 'DELIVERED', deliveredAt: new Date(), jugsReturned },
  });

  await tx.customer.update({
    where: { id: order.customerId },
    data: {
      jugsWithCustomer: { increment: refills - jugsReturned },
      jugDeposits: { increment: purchased },
    },
  });

  const jug = await tx.inventoryItem.findUnique({ where: { sku: JUG_SKU } });
  if (jug) {
    const stockDelta = jugsReturned - refills - purchased; // empties in, fulls out
    if (stockDelta !== 0) {
      await tx.inventoryItem.update({
        where: { id: jug.id },
        data: { quantity: { increment: stockDelta } },
      });
      await tx.inventoryMovement.create({
        data: { itemId: jug.id, delta: stockDelta, reason: 'delivery', reference: orderId },
      });
    }
  }
  return true;
}

/**
 * Mark an order delivered: moves jugs between stock and the customer's site
 * and records the empties picked up.
 */
export async function markDelivered(orderId: string, form: FormData) {
  const jugsReturned = Math.max(0, num(form, 'jugsReturned'));

  await prisma.$transaction((tx) => deliverOrderInTx(tx, orderId, jugsReturned).then(() => {}));

  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/inventory');
  revalidatePath('/');
}

/**
 * End-of-day bulk action: mark every still-open order on a date as delivered.
 * Empties returned aren't known per stop here, so they're recorded as 0 —
 * adjust per customer afterwards if needed (profile → Jugs → adjust).
 */
export async function markAllDeliveredForDate(form: FormData) {
  const dateStr = String(form.get('date'));
  const date = new Date(dateStr + 'T00:00:00');

  const open = await prisma.order.findMany({
    where: { deliveryDate: date, status: { in: ['SCHEDULED', 'OUT_FOR_DELIVERY'] } },
    select: { id: true },
  });

  let delivered = 0;
  for (const { id } of open) {
    const ok = await prisma.$transaction((tx) => deliverOrderInTx(tx, id, 0));
    if (ok) delivered++;
  }

  revalidatePath('/orders');
  revalidatePath('/inventory');
  revalidatePath('/');
  redirect(`/orders?date=${dateStr}&delivered=${delivered}`);
}

/** Cash/Venmo/etc. collected on the spot — records the payment and closes the order. */
export async function logOrderPayment(orderId: string, form: FormData) {
  const method = String(form.get('method')) as PaymentMethod;
  const amount = num(form, 'amount');
  const reference = (form.get('reference') as string | null)?.trim() || null;
  if (amount <= 0) return;

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  await prisma.$transaction([
    prisma.payment.create({
      data: { customerId: order.customerId, method, amount, reference, note: `Order #${order.number}` },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paymentMethod: method, deliveredAt: order.deliveredAt ?? new Date() },
    }),
  ]);

  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/');
}

export async function cancelOrder(orderId: string) {
  await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
}

/**
 * "Generate all Monday deliveries" — creates subscription orders for a date.
 * WEEKLY: every matching weekday. BIWEEKLY: matching weekday on alternating
 * weeks (anchored to the customer's start date). MONTHLY: first matching
 * weekday of the month. Customers without a preferred day default to Monday.
 */
export async function generateSubscriptionOrders(form: FormData) {
  const dateStr = String(form.get('date'));
  const date = new Date(dateStr + 'T00:00:00');
  const weekday = date.getDay();

  const customers = await prisma.customer.findMany({
    where: { status: 'ACTIVE', plan: { in: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] } },
    include: { zone: true },
  });

  const config = await getConfig();
  let created = 0;

  for (const c of customers) {
    const preferred = c.preferredDay ?? 1; // default Monday
    if (preferred !== weekday) continue;

    if (c.plan === 'BIWEEKLY') {
      const weeksSinceStart = Math.floor(
        (date.getTime() - new Date(c.startedAt).getTime()) / (7 * 86_400_000)
      );
      if (weeksSinceStart % 2 !== 0) continue;
    }
    if (c.plan === 'MONTHLY' && date.getDate() > 7) continue; // first week only

    const existing = await prisma.order.findFirst({
      where: { customerId: c.id, deliveryDate: date, status: { not: 'CANCELLED' } },
    });
    if (existing) continue;

    const quote = quoteOrder(config, {
      refillJugs: c.planJugs,
      plan: c.plan,
      zoneDeliveryFee: c.zone ? c.zone.deliveryFee : null,
    });

    await prisma.order.create({
      data: {
        customerId: c.id,
        deliveryDate: date,
        fromSubscription: true,
        instructions: c.deliveryNotes,
        subtotal: quote.subtotal,
        discount: quote.discount,
        deliveryFee: quote.deliveryFee,
        total: quote.total,
        items: {
          create: quote.lines.map((l) => ({
            productType: l.productType,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });
    created++;
  }

  revalidatePath('/orders');
  revalidatePath('/');
  redirect(`/orders?date=${dateStr}&generated=${created}`);
}
