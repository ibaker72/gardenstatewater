'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { fullAddress } from '@/lib/format';
import { geocode, legTotals, optimizeOrder, travelMatrix, type Point } from '@/lib/routing';

// Default depot: where the van starts the day. Owner can type any address.
const DEFAULT_START = 'Newark, NJ';
// Rough center of Newark, used when the start address can't be geocoded.
const FALLBACK_START: Point = { lat: 40.7357, lng: -74.1724 };

export async function buildRoute(form: FormData) {
  const dateStr = String(form.get('date'));
  const date = new Date(dateStr + 'T00:00:00');
  const startAddress = (form.get('startAddress') as string | null)?.trim() || DEFAULT_START;

  const orders = await prisma.order.findMany({
    where: { deliveryDate: date, status: { in: ['SCHEDULED', 'OUT_FOR_DELIVERY'] } },
    include: { customer: true },
  });
  if (orders.length === 0) redirect(`/routes?date=${dateStr}&error=noorders`);

  // Geocode customers that don't have coordinates yet (needs a Google key).
  for (const o of orders) {
    if (o.customer.lat === null || o.customer.lng === null) {
      const pt = await geocode(fullAddress(o.customer));
      if (pt) {
        await prisma.customer.update({ where: { id: o.customer.id }, data: pt });
        o.customer.lat = pt.lat;
        o.customer.lng = pt.lng;
      }
    }
  }

  const located = orders.filter((o) => o.customer.lat !== null && o.customer.lng !== null);
  const unlocated = orders.filter((o) => o.customer.lat === null || o.customer.lng === null);

  const startPoint = (await geocode(startAddress)) ?? FALLBACK_START;
  const points: Point[] = [
    startPoint,
    ...located.map((o) => ({ lat: o.customer.lat!, lng: o.customer.lng! })),
  ];

  const matrix = await travelMatrix(points);
  const order = optimizeOrder(matrix.miles); // indices into points, 1-based for stops
  const { legs, totalMiles, totalMinutes } = legTotals(order, matrix);

  const route = await prisma.$transaction(async (tx) => {
    // One route per day — rebuild replaces the old one.
    await tx.route.deleteMany({ where: { date } });
    return tx.route.create({
      data: {
        date,
        name: `Route ${dateStr}`,
        startAddress,
        totalMiles,
        totalMinutes,
        optimizedWith: matrix.source,
        stops: {
          create: [
            ...order.map((pointIdx, seq) => ({
              orderId: located[pointIdx - 1].id,
              sequence: seq + 1,
              milesFromPrev: legs[seq].miles,
              minutesFromPrev: legs[seq].minutes,
            })),
            // Un-geocoded stops go at the end, unordered.
            ...unlocated.map((o, i) => ({
              orderId: o.id,
              sequence: order.length + i + 1,
            })),
          ],
        },
      },
    });
  });

  revalidatePath('/routes');
  redirect(`/routes?date=${dateStr}&built=${route.id ? orders.length : 0}`);
}

/** Move a stop up or down one position and recompute leg estimates. */
export async function moveStop(stopId: string, direction: 'up' | 'down') {
  const stop = await prisma.routeStop.findUnique({
    where: { id: stopId },
    include: { route: { include: { stops: { orderBy: { sequence: 'asc' }, include: { order: { include: { customer: true } } } } } } },
  });
  if (!stop) return;
  const stops = stop.route.stops;
  const idx = stops.findIndex((s) => s.id === stopId);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= stops.length) return;

  await prisma.$transaction([
    prisma.routeStop.update({ where: { id: stops[idx].id }, data: { sequence: stops[swapIdx].sequence } }),
    prisma.routeStop.update({ where: { id: stops[swapIdx].id }, data: { sequence: stops[idx].sequence } }),
  ]);

  await recomputeRouteLegs(stop.routeId);
  revalidatePath('/routes');
}

/** Recompute per-leg + total miles/minutes after manual reordering (haversine). */
async function recomputeRouteLegs(routeId: string) {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: { stops: { orderBy: { sequence: 'asc' }, include: { order: { include: { customer: true } } } } },
  });
  if (!route) return;

  const startPoint = (route.startAddress ? await geocode(route.startAddress) : null) ?? FALLBACK_START;
  const located = route.stops.filter((s) => s.order.customer.lat !== null && s.order.customer.lng !== null);
  if (located.length === 0) return;

  const points: Point[] = [
    startPoint,
    ...located.map((s) => ({ lat: s.order.customer.lat!, lng: s.order.customer.lng! })),
  ];
  const matrix = await travelMatrix(points);
  // Visit order is already fixed (1..n) — just total up the legs.
  const order = located.map((_, i) => i + 1);
  const { legs, totalMiles, totalMinutes } = legTotals(order, matrix);

  await prisma.$transaction([
    ...located.map((s, i) =>
      prisma.routeStop.update({
        where: { id: s.id },
        data: { milesFromPrev: legs[i].miles, minutesFromPrev: legs[i].minutes },
      })
    ),
    prisma.route.update({
      where: { id: routeId },
      data: { totalMiles, totalMinutes, optimizedWith: matrix.source },
    }),
  ]);
}

/** Check a stop off the route. First check-off also bumps the order to out-for-delivery. */
export async function toggleStopCompleted(stopId: string) {
  const stop = await prisma.routeStop.findUnique({ where: { id: stopId }, include: { order: true } });
  if (!stop) return;
  const nowDone = stop.completedAt === null;
  await prisma.routeStop.update({
    where: { id: stopId },
    data: { completedAt: nowDone ? new Date() : null },
  });
  if (nowDone && stop.order.status === 'SCHEDULED') {
    await prisma.order.update({ where: { id: stop.orderId }, data: { status: 'OUT_FOR_DELIVERY' } });
  }
  revalidatePath('/routes');
}
