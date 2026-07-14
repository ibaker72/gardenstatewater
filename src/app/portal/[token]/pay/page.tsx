import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CreditCard, Receipt } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { customerBalance } from '@/lib/data';
import { money, shortDate } from '@/lib/format';
import { stripeConfigured } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const card = 'rounded-3xl border border-aqua-100 bg-white p-5 shadow-lg shadow-aqua-100/40';
const bigBtn =
  'flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold transition active:scale-[0.99]';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  VENMO: 'Venmo',
  CASHAPP: 'CashApp',
  ZELLE: 'Zelle',
  STRIPE: 'Card (online)',
  CHECK: 'Check',
  OTHER: 'Other',
};

export default async function PortalPayPage({
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
      invoices: {
        where: { status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
        orderBy: { dueDate: 'asc' },
      },
      payments: { orderBy: { receivedAt: 'desc' }, take: 10 },
    },
  });
  if (!customer || !customer.portalAccess) notFound();

  const balance = await customerBalance(customer.id);
  const payable = customer.invoices.filter((i) => i.total - i.amountPaid > 0);
  const invoiceTotal = payable.reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const online = stripeConfigured();
  const hasOverdue = payable.some((i) => i.status === 'OVERDUE');

  return (
    <div className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white pb-10">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-6">
        <Link
          href={`/portal/${token}`}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-medium text-slate-500 hover:bg-white/70 hover:text-navy-900"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-xl font-bold text-navy-900">Pay my bill</h1>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-5 pt-5">
        {paid && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-800">
            ✓ Thank you! Your payment is processing — your balance will update in a minute, and a
            receipt is on its way to your email.
          </p>
        )}

        {/* Balance summary */}
        <section className={card}>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            You owe
          </div>
          <div
            className={`mt-1 text-4xl font-bold tabular-nums ${
              balance <= 0 ? 'text-emerald-600' : hasOverdue ? 'text-red-600' : 'text-navy-900'
            }`}
          >
            {money(Math.max(balance, 0))}
          </div>
          {balance <= 0 && (
            <p className="mt-1 text-base text-slate-500">You’re all paid up 🎉</p>
          )}
          {balance > 0 && payable.length === 0 && (
            <p className="mt-1 text-base text-slate-500">
              Your next invoice will include this — nothing to pay online just yet.
            </p>
          )}
          {online && payable.length > 0 && (
            <a
              href={`/api/pay/all/${token}`}
              className={`${bigBtn} mt-4 w-full bg-aqua-500 text-white hover:bg-aqua-600`}
            >
              <CreditCard size={20} /> Pay all · {money(invoiceTotal)}
            </a>
          )}
          {!online && payable.length > 0 && (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-base text-slate-500">
              Pay by cash, Venmo, or CashApp at your next delivery — or text us and we&apos;ll sort
              it out.
            </p>
          )}
        </section>

        {/* Itemized invoices */}
        {payable.length > 0 && (
          <section className={card}>
            <h2 className="text-lg font-semibold text-navy-900">What makes up your balance</h2>
            <ul className="mt-1 divide-y divide-slate-100">
              {payable.map((inv) => (
                <li key={inv.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-medium text-navy-900">
                        Invoice #{inv.number}
                      </div>
                      <div className="text-sm text-slate-500">
                        Sent {shortDate(inv.issueDate)} ·{' '}
                        <span className={inv.status === 'OVERDUE' ? 'font-medium text-red-600' : ''}>
                          due {shortDate(inv.dueDate)}
                          {inv.status === 'OVERDUE' ? ' (overdue)' : ''}
                        </span>
                      </div>
                      {inv.amountPaid > 0 && (
                        <div className="text-sm text-slate-400">
                          {money(inv.amountPaid)} already paid
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold tabular-nums text-navy-900">
                        {money(inv.total - inv.amountPaid)}
                      </div>
                      {online && (
                        <a
                          href={`/api/pay/${inv.id}`}
                          className="text-base font-semibold text-aqua-700 hover:underline"
                        >
                          Pay this one
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Payment history */}
        <section className={card}>
          <div className="flex items-center gap-2">
            <Receipt size={19} className="text-aqua-600" />
            <h2 className="text-lg font-semibold text-navy-900">Payment history</h2>
          </div>
          {customer.payments.length === 0 ? (
            <p className="mt-2 text-base text-slate-400">No payments yet.</p>
          ) : (
            <ul className="mt-1 divide-y divide-slate-100 text-base">
              {customer.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-medium text-navy-900">{shortDate(p.receivedAt)}</div>
                    <div className="text-sm text-slate-500">
                      {METHOD_LABELS[p.method] ?? p.method}
                      {p.note ? ` · ${p.note}` : ''}
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums text-emerald-600">
                    {money(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
