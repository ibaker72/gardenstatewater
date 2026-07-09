import { prisma } from './prisma';

export const RECEIVABLE_STATUSES = ['DELIVERED', 'PAID'] as const;

/** Balance = delivered/paid order totals minus all payments. Positive = customer owes. */
export async function customerBalances(customerIds?: string[]) {
  const where = customerIds ? { customerId: { in: customerIds } } : {};
  const [charges, payments] = await Promise.all([
    prisma.order.groupBy({
      by: ['customerId'],
      where: { ...where, status: { in: [...RECEIVABLE_STATUSES] } },
      _sum: { total: true },
    }),
    prisma.payment.groupBy({
      by: ['customerId'],
      where,
      _sum: { amount: true },
    }),
  ]);
  const balances = new Map<string, number>();
  for (const c of charges) balances.set(c.customerId, c._sum.total ?? 0);
  for (const p of payments) {
    balances.set(p.customerId, (balances.get(p.customerId) ?? 0) - (p._sum.amount ?? 0));
  }
  for (const [k, v] of balances) balances.set(k, Math.round(v * 100) / 100);
  return balances;
}

export async function customerBalance(customerId: string): Promise<number> {
  const balances = await customerBalances([customerId]);
  return balances.get(customerId) ?? 0;
}

/** Most recent delivered-order date per customer. */
export async function lastDeliveryDates(customerIds?: string[]) {
  const rows = await prisma.order.groupBy({
    by: ['customerId'],
    where: {
      ...(customerIds ? { customerId: { in: customerIds } } : {}),
      status: { in: ['DELIVERED', 'PAID'] },
    },
    _max: { deliveryDate: true },
  });
  const map = new Map<string, Date>();
  for (const r of rows) if (r._max.deliveryDate) map.set(r.customerId, r._max.deliveryDate);
  return map;
}

export const AT_RISK_DAYS = 30;

export function isAtRisk(lastDelivery: Date | undefined, createdAt: Date, now = new Date()) {
  const ref = lastDelivery ?? createdAt;
  return now.getTime() - ref.getTime() > AT_RISK_DAYS * 86_400_000;
}

/** Jug inventory item is the canonical stock record. */
export const JUG_SKU = 'JUG_5GAL';

export async function jugStock() {
  const item = await prisma.inventoryItem.findUnique({ where: { sku: JUG_SKU } });
  return item;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
