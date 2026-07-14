import { notFound } from 'next/navigation';
import {
  CalendarPlus,
  CreditCard,
  Droplets,
  MessageCircle,
  PauseCircle,
  Truck,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { customerBalance } from '@/lib/data';
import { getConfig } from '@/lib/pricing';
import { friendlyDay, money, PLAN_LABELS, shortDate } from '@/lib/format';
import { stripeConfigured } from '@/lib/stripe';
import { requestPauseOrResume, updateContactInfo } from '@/server/actions/portal';
import { SignOutButton } from '@/components/portal/SignOutButton';

export const dynamic = 'force-dynamic';

const card = 'rounded-3xl border border-aqua-100 bg-white p-5 shadow-lg shadow-aqua-100/40';

export default async function PortalHomePage({
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
      orders: { orderBy: { deliveryDate: 'desc' }, take: 30, include: { items: true } },
      invoices: {
        where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        orderBy: { dueDate: 'asc' },
      },
    },
  });
  if (!customer || !customer.portalAccess) notFound();

  const [balance, config] = await Promise.all([customerBalance(customer.id), getConfig()]);
  const upcoming = customer.orders
    .filter((o) => o.status === 'SCHEDULED' || o.status === 'OUT_FOR_DELIVERY')
    .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());
  const history = customer.orders
    .filter((o) => o.status === 'DELIVERED' || o.status === 'PAID')
    .slice(0, 6);

  const next = upcoming[0];
  const nextJugs = next
    ? next.items.filter((i) => i.productType === 'JUG_REFILL').reduce((s, i) => s + i.quantity, 0)
    : 0;

  const hasOverdue = customer.invoices.some((i) => i.status === 'OVERDUE');
  const openInvoice = customer.invoices[0];
  const canPayOnline = stripeConfigured() && openInvoice && openInvoice.total - openInvoice.amountPaid > 0;

  const contactHref = config.businessPhone
    ? `sms:${config.businessPhone.replace(/[^\d+]/g, '')}`
    : config.businessEmail
      ? `mailto:${config.businessEmail}`
      : '#contact';

  const pauseResume = requestPauseOrResume.bind(null, token);
  const contact = updateContactInfo.bind(null, token);

  const firstName = customer.name.split(' ')[0];

  const quickAction =
    'flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold transition active:scale-[0.99]';

  return (
    <div className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white pb-10">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-aqua-500 shadow-md shadow-aqua-200">
            <Droplets size={22} className="text-white" />
          </div>
          <div className="font-bold leading-tight text-navy-900">Garden State Water</div>
        </div>
        <SignOutButton />
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-5 pt-6">
        <h1 className="text-3xl font-bold text-navy-900">Hi {firstName}! 👋</h1>

        {paid && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-800">
            ✓ Thanks! Your payment is processing — your balance will update shortly.
          </p>
        )}
        {customer.status === 'PAUSED' && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-base text-amber-900">
            Your deliveries are paused.
            <form action={pauseResume} className="mt-2">
              <input type="hidden" name="kind" value="RESUME" />
              <button className={`${quickAction} w-full bg-amber-500 text-white hover:bg-amber-600`}>
                Resume my deliveries
              </button>
            </form>
          </div>
        )}

        {/* Balance */}
        <section className={card} id="bill">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Your balance
              </div>
              <div
                className={`mt-1 text-4xl font-bold tabular-nums ${
                  balance <= 0 ? 'text-emerald-600' : hasOverdue ? 'text-red-600' : 'text-navy-900'
                }`}
              >
                {money(Math.max(balance, 0))}
              </div>
              <p className="mt-1 text-base text-slate-500">
                {balance <= 0
                  ? 'You’re all paid up 🎉'
                  : hasOverdue
                    ? 'Past due — please pay when you can.'
                    : openInvoice
                      ? `Due by ${shortDate(openInvoice.dueDate)}.`
                      : 'We’ll include this on your next invoice.'}
              </p>
            </div>
          </div>
          {balance > 0 &&
            (canPayOnline ? (
              <a
                href={`/api/pay/${openInvoice.id}`}
                className={`${quickAction} mt-4 w-full bg-aqua-500 text-white hover:bg-aqua-600`}
              >
                <CreditCard size={20} /> Pay my balance
              </a>
            ) : (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-base text-slate-500">
                Pay by cash, Venmo, or CashApp at your next delivery.
              </p>
            ))}

          <a
            href={`/portal/${token}/pay`}
            className="mt-3 inline-block text-base font-semibold text-aqua-700 hover:underline"
          >
            See my bill &amp; payment history →
          </a>
        </section>

        {/* Next delivery + jugs */}
        <section className={card}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-aqua-100 text-aqua-700">
              <Truck size={24} />
            </div>
            <div>
              {next ? (
                <>
                  <div className="text-lg font-semibold text-navy-900">
                    {nextJugs > 0 ? `${nextJugs} jug${nextJugs === 1 ? '' : 's'}` : 'Your delivery'} arriving{' '}
                    {friendlyDay(next.deliveryDate)}
                  </div>
                  <p className="text-base text-slate-500">
                    {next.items.map((i) => i.description ?? i.productType).join(', ')} · {money(next.total)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold text-navy-900">No delivery scheduled yet</div>
                  <p className="text-base text-slate-500">Request one below and we’ll set it up.</p>
                </>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-aqua-50 px-4 py-3">
            <span className="text-base text-slate-600">Our jugs at your place</span>
            <span className="text-2xl font-bold tabular-nums text-navy-900">{customer.jugsWithCustomer}</span>
          </div>
          {upcoming.length > 1 && (
            <ul className="mt-3 space-y-1.5 text-base text-slate-500">
              {upcoming.slice(1, 4).map((o) => (
                <li key={o.id} className="flex justify-between">
                  <span>Then {friendlyDay(o.deliveryDate)}</span>
                  <span className="tabular-nums">{money(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-3">
          {canPayOnline ? (
            <a href={`/portal/${token}/pay`} className={`${quickAction} bg-aqua-500 text-white hover:bg-aqua-600`}>
              <CreditCard size={20} /> Pay balance
            </a>
          ) : (
            <a href={`/portal/${token}/pay`} className={`${quickAction} border border-aqua-200 bg-white text-navy-900 hover:bg-aqua-50`}>
              <CreditCard size={20} /> My bill
            </a>
          )}
          <a href={`/portal/${token}/request`} className={`${quickAction} border border-aqua-200 bg-white text-navy-900 hover:bg-aqua-50`}>
            <CalendarPlus size={20} /> Extra delivery
          </a>
          <a href="#request" className={`${quickAction} border border-aqua-200 bg-white text-navy-900 hover:bg-aqua-50`}>
            <PauseCircle size={20} /> Pause service
          </a>
          <a href={contactHref} className={`${quickAction} border border-aqua-200 bg-white text-navy-900 hover:bg-aqua-50`}>
            <MessageCircle size={20} /> Contact us
          </a>
        </section>

        {/* Request / pause */}
        <section className={card} id="request">
          <h2 className="text-lg font-semibold text-navy-900">Need something?</h2>
          <a
            href={`/portal/${token}/request`}
            className={`${quickAction} mt-3 w-full bg-aqua-500 text-white hover:bg-aqua-600`}
          >
            <CalendarPlus size={20} /> Request a delivery
          </a>
          {customer.status === 'ACTIVE' && (
            <form action={pauseResume} className="mt-3">
              <input type="hidden" name="kind" value="PAUSE" />
              <button className={`${quickAction} w-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
                <PauseCircle size={20} /> Pause my service
              </button>
            </form>
          )}
          <p className="mt-3 text-sm text-slate-400">
            We&apos;ll confirm your request within a couple of hours.
          </p>
        </section>

        {/* Recent deliveries */}
        <section className={card} id="deliveries">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-navy-900">Recent deliveries</h2>
            <a
              href={`/portal/${token}/deliveries`}
              className="text-base font-semibold text-aqua-700 hover:underline"
            >
              See all →
            </a>
          </div>
          {history.length === 0 ? (
            <p className="mt-2 text-base text-slate-400">No deliveries yet.</p>
          ) : (
            <ul className="mt-1 divide-y divide-slate-100 text-base">
              {history.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-medium text-navy-900">{shortDate(o.deliveryDate)}</div>
                    <div className="text-sm text-slate-500">
                      {o.items.map((i) => i.description ?? i.productType).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-navy-900">{money(o.total)}</div>
                    <div className={`text-sm ${o.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {o.status === 'PAID' ? 'paid' : 'unpaid'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Contact info */}
        <section className={card} id="contact">
          <h2 className="text-lg font-semibold text-navy-900">Your info</h2>
          <p className="mt-0.5 text-base text-slate-500">
            {customer.address}
            {customer.city ? `, ${customer.city}` : ''} · {PLAN_LABELS[customer.plan]} plan
          </p>
          <form action={contact} className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">Phone</label>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={customer.phone ?? ''}
                className="h-14 w-full rounded-2xl border border-aqua-200 bg-white px-5 text-base text-navy-900 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-500">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={customer.email ?? ''}
                className="h-14 w-full rounded-2xl border border-aqua-200 bg-white px-5 text-base text-navy-900 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100"
              />
            </div>
            <button className={`${quickAction} w-full border border-aqua-200 bg-white text-navy-900 hover:bg-aqua-50`}>
              Update my info
            </button>
          </form>
        </section>

        <p className="pt-2 text-center text-sm text-slate-400">
          {config.businessName}
          {config.businessPhone ? ` · call or text ${config.businessPhone}` : ' · questions? call or text your delivery driver'}
        </p>
      </main>
    </div>
  );
}
