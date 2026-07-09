import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { dayDate, fullAddress, isoDate, money } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import { PrintButton } from '@/components/PrintButton';

export default async function DeliverySheetPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const dateStr = searchParams.date ?? isoDate(new Date());
  const date = new Date(dateStr + 'T00:00:00');

  const [orders, route] = await Promise.all([
    prisma.order.findMany({
      where: { deliveryDate: date, status: { in: ['SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PAID'] } },
      include: { customer: { include: { zone: true } }, items: true },
    }),
    prisma.route.findFirst({
      where: { date },
      include: { stops: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Route order wins; otherwise group by zone then name.
  const seq = new Map<string, number>();
  route?.stops.forEach((s) => seq.set(s.orderId, s.sequence));
  const sorted = [...orders].sort((a, b) => {
    const sa = seq.get(a.id);
    const sb = seq.get(b.id);
    if (sa !== undefined && sb !== undefined) return sa - sb;
    if (sa !== undefined) return -1;
    if (sb !== undefined) return 1;
    const za = a.customer.zone?.name ?? 'zz';
    const zb = b.customer.zone?.name ?? 'zz';
    return za.localeCompare(zb) || a.customer.name.localeCompare(b.customer.name);
  });

  const totalJugs = sorted.reduce(
    (s, o) => s + o.items.filter((i) => i.productType === 'JUG_REFILL').reduce((x, i) => x + i.quantity, 0),
    0
  );
  const expectedRevenue = sorted.reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        title="Delivery sheet"
        subtitle={`${dayDate(date)} · ${sorted.length} stops · ${totalJugs} jugs · ${money(expectedRevenue)} expected`}
        actions={
          <div className="no-print flex gap-2">
            <form method="GET" className="flex gap-2">
              <input type="date" name="date" defaultValue={dateStr} className="input" />
              <button className="btn-secondary">Go</button>
            </form>
            <PrintButton />
          </div>
        }
      />
      <p className="no-print mb-4 text-xs text-slate-400">
        This page is cached for offline use — open it once on wifi and it&apos;ll still load on the road.
        {route ? ' Sorted by optimized route.' : ' No route built yet — sorted by zone.'}
      </p>

      <ol className="space-y-3">
        {sorted.map((o, idx) => {
          const jugs = o.items.filter((i) => i.productType === 'JUG_REFILL').reduce((s, i) => s + i.quantity, 0);
          const done = o.status === 'DELIVERED' || o.status === 'PAID';
          return (
            <li key={o.id} className={`card flex gap-3 p-4 ${done ? 'opacity-50' : ''}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 font-bold text-white dark:bg-aqua-500 dark:text-navy-950">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/orders/${o.id}`} className="font-semibold hover:underline">
                    {o.customer.name}
                  </Link>
                  <span className="text-sm font-bold tabular-nums">{money(o.total)}</span>
                </div>
                <a
                  className="block truncate text-sm text-aqua-600 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(o.customer))}`}
                >
                  {fullAddress(o.customer)}
                </a>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {o.items.map((i) => i.description ?? i.productType).join(' · ')}
                  {o.customer.jugsWithCustomer > 0 && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      ⟳ collect up to {o.customer.jugsWithCustomer} empties
                    </span>
                  )}
                </div>
                {(o.instructions ?? o.customer.deliveryNotes) && (
                  <div className="mt-1 text-sm text-slate-500">📝 {o.instructions ?? o.customer.deliveryNotes}</div>
                )}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  {o.customer.phone && (
                    <a href={`tel:${o.customer.phone}`} className="no-print text-aqua-600">
                      call
                    </a>
                  )}
                  {o.customer.phone && (
                    <a href={`sms:${o.customer.phone}`} className="no-print text-aqua-600">
                      text
                    </a>
                  )}
                  <span>{jugs} jugs</span>
                  <span>{o.customer.zone?.name ?? 'unzoned'}</span>
                  {done && <span className="font-semibold text-emerald-600">✓ delivered</span>}
                </div>
              </div>
              <div className="hidden h-6 w-6 shrink-0 rounded border-2 border-slate-300 print:block" />
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="card p-8 text-center text-slate-400">No deliveries scheduled for this day.</li>
        )}
      </ol>
    </>
  );
}
