import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from 'date-fns';
import { prisma } from './prisma';
import { round2 } from './pricing-core';

const REVENUE_STATUSES = ['DELIVERED', 'PAID'] as const;

/** Revenue recognized on delivery, bucketed by ISO week (Mon start). */
export async function weeklyRevenue(weeks = 8) {
  const start = startOfWeek(addWeeks(new Date(), -(weeks - 1)), { weekStartsOn: 1 });
  const orders = await prisma.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, deliveryDate: { gte: start } },
    select: { deliveryDate: true, total: true },
  });
  const buckets: { label: string; start: Date; revenue: number }[] = [];
  for (let i = 0; i < weeks; i++) {
    const s = addWeeks(start, i);
    buckets.push({ label: format(s, 'MMM d'), start: s, revenue: 0 });
  }
  for (const o of orders) {
    const idx = Math.floor(
      (startOfWeek(o.deliveryDate, { weekStartsOn: 1 }).getTime() - start.getTime()) /
        (7 * 86_400_000)
    );
    if (buckets[idx]) buckets[idx].revenue = round2(buckets[idx].revenue + o.total);
  }
  return buckets.map(({ label, revenue }) => ({ label, revenue }));
}

export async function monthlyRevenue(months = 6) {
  const start = startOfMonth(addMonths(new Date(), -(months - 1)));
  const orders = await prisma.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, deliveryDate: { gte: start } },
    select: { deliveryDate: true, total: true },
  });
  const buckets = Array.from({ length: months }, (_, i) => {
    const s = addMonths(start, i);
    return { label: format(s, 'MMM'), key: format(s, 'yyyy-MM'), revenue: 0 };
  });
  for (const o of orders) {
    const key = format(o.deliveryDate, 'yyyy-MM');
    const b = buckets.find((x) => x.key === key);
    if (b) b.revenue = round2(b.revenue + o.total);
  }
  return buckets.map(({ label, revenue }) => ({ label, revenue }));
}

export async function deliveryVolume(weeks = 12) {
  const start = startOfWeek(addWeeks(new Date(), -(weeks - 1)), { weekStartsOn: 1 });
  const orders = await prisma.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, deliveryDate: { gte: start } },
    include: { items: true },
  });
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    label: format(addWeeks(start, i), 'MMM d'),
    deliveries: 0,
    jugs: 0,
  }));
  for (const o of orders) {
    const idx = Math.floor(
      (startOfWeek(o.deliveryDate, { weekStartsOn: 1 }).getTime() - start.getTime()) /
        (7 * 86_400_000)
    );
    if (!buckets[idx]) continue;
    buckets[idx].deliveries++;
    buckets[idx].jugs += o.items
      .filter((i) => i.productType === 'JUG_REFILL')
      .reduce((s, i) => s + i.quantity, 0);
  }
  return buckets;
}

export async function topCustomers(limit = 10) {
  const grouped = await prisma.order.groupBy({
    by: ['customerId'],
    where: { status: { in: [...REVENUE_STATUSES] } },
    _sum: { total: true },
    _count: { _all: true },
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });
  const customers = await prisma.customer.findMany({
    where: { id: { in: grouped.map((g) => g.customerId) } },
    select: { id: true, name: true },
  });
  const names = new Map(customers.map((c) => [c.id, c.name]));
  return grouped.map((g) => ({
    customerId: g.customerId,
    name: names.get(g.customerId) ?? 'Unknown',
    revenue: round2(g._sum.total ?? 0),
    orders: g._count._all,
  }));
}

export async function avgOrderValue(days = 90) {
  const since = addDays(new Date(), -days);
  const agg = await prisma.order.aggregate({
    where: { status: { in: [...REVENUE_STATUSES] }, deliveryDate: { gte: since } },
    _avg: { total: true },
    _count: { _all: true },
  });
  return { avg: round2(agg._avg.total ?? 0), count: agg._count._all };
}

/** New vs churned customers per month. Churned = status CHURNED, bucketed by updatedAt. */
export async function customerGrowth(months = 6) {
  const start = startOfMonth(addMonths(new Date(), -(months - 1)));
  const [created, churned] = await Promise.all([
    prisma.customer.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.customer.findMany({
      where: { status: 'CHURNED', updatedAt: { gte: start } },
      select: { updatedAt: true },
    }),
  ]);
  const buckets = Array.from({ length: months }, (_, i) => {
    const s = addMonths(start, i);
    return { label: format(s, 'MMM'), key: format(s, 'yyyy-MM'), new: 0, churned: 0 };
  });
  for (const c of created) {
    const b = buckets.find((x) => x.key === format(c.createdAt, 'yyyy-MM'));
    if (b) b.new++;
  }
  for (const c of churned) {
    const b = buckets.find((x) => x.key === format(c.updatedAt, 'yyyy-MM'));
    if (b) b.churned++;
  }
  return buckets.map(({ label, new: n, churned: ch }) => ({ label, new: n, churned: ch }));
}

/** Consecutive days (ending today or yesterday) with at least one completed delivery. */
export async function deliveryStreak() {
  const since = addDays(new Date(), -60);
  const orders = await prisma.order.findMany({
    where: { status: { in: [...REVENUE_STATUSES] }, deliveryDate: { gte: since } },
    select: { deliveryDate: true },
  });
  const days = new Set(orders.map((o) => format(o.deliveryDate, 'yyyy-MM-dd')));
  let streak = 0;
  let cursor = new Date();
  // A streak can be alive without a delivery yet today.
  if (!days.has(format(cursor, 'yyyy-MM-dd'))) cursor = addDays(cursor, -1);
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Collected / charged over the trailing window. */
export async function collectionRate(days = 90) {
  const since = addDays(new Date(), -days);
  const [charged, paid] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: [...REVENUE_STATUSES] }, deliveryDate: { gte: since } },
      _sum: { total: true },
    }),
    prisma.payment.aggregate({ where: { receivedAt: { gte: since } }, _sum: { amount: true } }),
  ]);
  const c = charged._sum.total ?? 0;
  const p = paid._sum.amount ?? 0;
  if (c === 0) return 1;
  return Math.min(1, p / c);
}

/** Miles driven vs revenue earned per route day. */
export async function routeEfficiency(limit = 10) {
  const routes = await prisma.route.findMany({
    orderBy: { date: 'desc' },
    take: limit,
    include: { stops: { include: { order: true } } },
  });
  return routes
    .map((r) => {
      const revenue = round2(r.stops.reduce((s, st) => s + st.order.total, 0));
      const miles = r.totalMiles ?? 0;
      return {
        date: r.date,
        stops: r.stops.length,
        miles,
        revenue,
        revenuePerMile: miles > 0 ? round2(revenue / miles) : null,
      };
    })
    .reverse();
}

/** Weekly jug stock level, reconstructed backwards from current quantity and movements. */
export async function jugInventoryTrend(weeks = 12) {
  const jug = await prisma.inventoryItem.findUnique({
    where: { sku: 'JUG_5GAL' },
    include: { movements: { where: { createdAt: { gte: addWeeks(new Date(), -weeks) } } } },
  });
  if (!jug) return [];
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    label: format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -(weeks - 1 - i)), 'MMM d'),
    start: addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -(weeks - 1 - i)),
    stock: 0,
  }));
  // Walk back: stock at end of each week = current − movements after that week.
  for (const b of buckets) {
    const weekEnd = addDays(b.start, 7);
    const after = jug.movements
      .filter((m) => m.createdAt >= weekEnd)
      .reduce((s, m) => s + m.delta, 0);
    b.stock = jug.quantity - after;
  }
  return buckets.map(({ label, stock }) => ({ label, stock }));
}

/** Simple P&L: revenue − water COGS − fuel estimate. */
export async function profitAndLoss(days = 30) {
  const since = addDays(new Date(), -days);
  const config = await prisma.pricingConfig.findUnique({ where: { id: 'default' } });
  const [orders, routes] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: [...REVENUE_STATUSES] }, deliveryDate: { gte: since } },
      include: { items: true },
    }),
    prisma.route.aggregate({ where: { date: { gte: since } }, _sum: { totalMiles: true } }),
  ]);
  const revenue = round2(orders.reduce((s, o) => s + o.total, 0));
  const jugs = orders.reduce(
    (s, o) => s + o.items.filter((i) => i.productType === 'JUG_REFILL').reduce((x, i) => x + i.quantity, 0),
    0
  );
  const cogs = round2(jugs * 5 * (config?.costPerGallon ?? 0.35));
  const miles = routes._sum.totalMiles ?? 0;
  const fuel = round2(miles * (config?.gasCostPerMile ?? 0.2));
  return { days, revenue, jugs, cogs, miles, fuel, net: round2(revenue - cogs - fuel) };
}
