import Link from 'next/link';
import { notFound } from 'next/navigation';
import { subMonths } from 'date-fns';
import { ArrowLeft, CalendarPlus, Package, Truck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { friendlyDay, money, shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const card = 'rounded-3xl border border-aqua-100 bg-white p-5 shadow-lg shadow-aqua-100/40';

export default async function PortalDeliveriesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const customer = await prisma.customer.findUnique({
    where: { portalToken: token },
    include: {
      orders: {
        where: {
          OR: [
            { status: { in: ['SCHEDULED', 'OUT_FOR_DELIVERY'] } },
            {
              status: { in: ['DELIVERED', 'PAID'] },
              deliveryDate: { gte: subMonths(new Date(), 6) },
            },
          ],
        },
        include: { items: true },
        orderBy: { deliveryDate: 'desc' },
      },
    },
  });
  if (!customer || !customer.portalAccess) notFound();

  const upcoming = customer.orders
    .filter((o) => o.status === 'SCHEDULED' || o.status === 'OUT_FOR_DELIVERY')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());
  const past = customer.orders.filter((o) => o.status === 'DELIVERED' || o.status === 'PAID');

  const itemsLabel = (o: (typeof customer.orders)[number]) =>
    o.items.map((i) => i.description ?? i.productType).join(', ');

  return (
    <div className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white pb-10">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-6">
        <Link
          href={`/portal/${token}`}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-medium text-slate-500 hover:bg-white/70 hover:text-navy-900"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-xl font-bold text-navy-900">My deliveries</h1>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-5 pt-5">
        {/* Upcoming */}
        <section className={card}>
          <div className="flex items-center gap-2">
            <Truck size={19} className="text-aqua-600" />
            <h2 className="text-lg font-semibold text-navy-900">Coming up</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="mt-2">
              <p className="text-base text-slate-400">Nothing scheduled right now.</p>
              <Link
                href={`/portal/${token}/request`}
                className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-aqua-500 px-4 text-base font-semibold text-white transition hover:bg-aqua-600 active:scale-[0.99]"
              >
                <CalendarPlus size={20} /> Request a delivery
              </Link>
            </div>
          ) : (
            <ul className="mt-2 space-y-2.5">
              {upcoming.map((o) => (
                <li key={o.id} className="rounded-2xl bg-aqua-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold capitalize text-navy-900">
                        {friendlyDay(o.deliveryDate)}
                        <span className="ml-2 font-normal normal-case text-slate-500">
                          {shortDate(o.deliveryDate)}
                        </span>
                      </div>
                      <div className="text-base text-slate-600">{itemsLabel(o)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums text-navy-900">{money(o.total)}</div>
                      <div
                        className={`text-sm font-medium ${
                          o.status === 'OUT_FOR_DELIVERY' ? 'text-aqua-700' : 'text-slate-500'
                        }`}
                      >
                        {o.status === 'OUT_FOR_DELIVERY' ? 'On the way! 🚚' : 'Scheduled'}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Past — timeline */}
        <section className={card}>
          <div className="flex items-center gap-2">
            <Package size={19} className="text-aqua-600" />
            <h2 className="text-lg font-semibold text-navy-900">Past deliveries</h2>
            <span className="text-sm text-slate-400">(last 6 months)</span>
          </div>
          {past.length === 0 ? (
            <p className="mt-2 text-base text-slate-400">No deliveries in the last 6 months.</p>
          ) : (
            <ol className="mt-3 space-y-0">
              {past.map((o, idx) => (
                <li key={o.id} className="relative pb-5 pl-6 last:pb-0">
                  {/* timeline rail + dot */}
                  {idx < past.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[7px] top-4 h-full w-0.5 bg-aqua-100"
                    />
                  )}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 ${
                      o.status === 'PAID'
                        ? 'border-emerald-100 bg-emerald-500'
                        : 'border-aqua-100 bg-aqua-500'
                    }`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-navy-900">
                        {shortDate(o.deliveryDate)}
                      </div>
                      <div className="text-base text-slate-600">{itemsLabel(o)}</div>
                      <div className="text-sm text-slate-400">
                        {o.jugsReturned > 0
                          ? `${o.jugsReturned} empty jug${o.jugsReturned === 1 ? '' : 's'} picked up`
                          : 'No empties picked up'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums text-navy-900">{money(o.total)}</div>
                      <div
                        className={`text-sm font-medium ${
                          o.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {o.status === 'PAID' ? 'Paid' : 'Unpaid'}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
