import { notFound } from 'next/navigation';
import { Droplets } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { customerBalance } from '@/lib/data';
import { dayDate, money, PLAN_LABELS, shortDate } from '@/lib/format';
import { stripeConfigured } from '@/lib/stripe';
import {
  requestExtraDelivery,
  requestPauseOrResume,
  updateContactInfo,
} from '@/server/actions/portal';

export const dynamic = 'force-dynamic';

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ token }, { paid }] = await Promise.all([params, searchParams]);
  const customer = await prisma.customer.findUnique({
    where: { portalToken: token },
    include: {
      orders: {
        orderBy: { deliveryDate: 'desc' },
        take: 30,
        include: { items: true },
      },
      invoices: {
        where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        orderBy: { dueDate: 'asc' },
      },
    },
  });
  if (!customer) notFound();

  const balance = await customerBalance(customer.id);
  const upcoming = customer.orders
    .filter((o) => o.status === 'SCHEDULED' || o.status === 'OUT_FOR_DELIVERY')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());
  const history = customer.orders.filter((o) => o.status === 'DELIVERED' || o.status === 'PAID').slice(0, 10);
  const openInvoice = customer.invoices[0];
  const canPayOnline = stripeConfigured() && openInvoice && openInvoice.total - openInvoice.amountPaid > 0;

  const extra = requestExtraDelivery.bind(null, token);
  const pauseResume = requestPauseOrResume.bind(null, token);
  const contact = updateContactInfo.bind(null, token);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 dark:bg-navy-950">
      {/* Header */}
      <header className="bg-navy-950 px-4 py-6 text-white">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Droplets className="text-aqua-400" size={26} />
          <div>
            <div className="font-bold leading-tight">Garden State Water</div>
            <div className="text-xs text-slate-300">Hi {customer.name.split(' ')[0]} 👋</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {paid && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
            ✓ Thanks! Your payment is processing — your balance will update shortly.
          </p>
        )}

        {customer.status === 'PAUSED' && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            Your service is paused.
            <form action={pauseResume} className="mt-2">
              <input type="hidden" name="kind" value="RESUME" />
              <button className="btn-primary w-full">Resume my deliveries</button>
            </form>
          </div>
        )}

        {/* Balance + jugs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance</div>
            <div className={`mt-1 text-2xl font-bold tabular-nums ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {money(balance)}
            </div>
            {canPayOnline ? (
              <a href={`/api/pay/${openInvoice.id}`} className="btn-primary mt-2 w-full">
                Pay online
              </a>
            ) : balance > 0 ? (
              <p className="mt-1 text-xs text-slate-400">Pay by cash, Venmo, or CashApp at your next delivery.</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">You&apos;re all paid up. 🎉</p>
            )}
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your jugs</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{customer.jugsWithCustomer}</div>
            <p className="mt-1 text-xs text-slate-400">
              5-gallon jugs at your place · {PLAN_LABELS[customer.plan]} plan
            </p>
          </div>
        </div>

        {/* Upcoming deliveries */}
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">Upcoming deliveries</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing scheduled yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-navy-800/50">
                  <div>
                    <div className="font-medium">{dayDate(o.deliveryDate)}</div>
                    <div className="text-xs text-slate-500">
                      {o.items.map((i) => i.description ?? i.productType).join(', ')}
                    </div>
                  </div>
                  <span className="font-medium tabular-nums">{money(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Request delivery / pause */}
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Need something?</h2>
          <form action={extra} className="space-y-2">
            <input
              name="detail"
              className="input"
              placeholder="e.g. 3 extra jugs before the weekend"
            />
            <button className="btn-primary w-full">Request extra delivery</button>
          </form>
          {customer.status === 'ACTIVE' && (
            <form action={pauseResume}>
              <input type="hidden" name="kind" value="PAUSE" />
              <button className="btn-secondary w-full">Pause my service</button>
            </form>
          )}
        </div>

        {/* Delivery history */}
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">Delivery history</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">No deliveries yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-navy-800">
              {history.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <div>
                    <div>{shortDate(o.deliveryDate)}</div>
                    <div className="text-xs text-slate-500">
                      {o.items.map((i) => i.description ?? i.productType).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular-nums">{money(o.total)}</div>
                    <div className={`text-xs ${o.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {o.status === 'PAID' ? 'paid' : 'unpaid'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Contact info */}
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">Your contact info</h2>
          <form action={contact} className="space-y-2">
            <div>
              <label className="label">Phone</label>
              <input name="phone" type="tel" defaultValue={customer.phone ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" defaultValue={customer.email ?? ''} className="input" />
            </div>
            <button className="btn-secondary w-full">Update</button>
          </form>
        </div>

        <p className="pb-4 text-center text-xs text-slate-400">
          Garden State Water · questions? call or text your delivery driver
        </p>
      </main>
    </div>
  );
}
