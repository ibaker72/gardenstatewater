import { notFound } from 'next/navigation';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { getConfig } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { money, shortDate } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import { PrintButton } from '@/components/PrintButton';

export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>; // YYYY-MM
}) {
  const [{ id }, { month }] = await Promise.all([params, searchParams]);
  const [customer, config] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    getConfig(),
  ]);
  if (!customer) notFound();

  const monthStr = month ?? format(new Date(), 'yyyy-MM');
  const monthStart = startOfMonth(new Date(monthStr + '-01T00:00:00'));
  const monthEnd = endOfMonth(monthStart);

  const [priorCharges, priorPayments, orders, payments] = await Promise.all([
    prisma.order.aggregate({
      where: { customerId: id, status: { in: ['DELIVERED', 'PAID'] }, deliveryDate: { lt: monthStart } },
      _sum: { total: true },
    }),
    prisma.payment.aggregate({
      where: { customerId: id, receivedAt: { lt: monthStart } },
      _sum: { amount: true },
    }),
    prisma.order.findMany({
      where: {
        customerId: id,
        status: { in: ['DELIVERED', 'PAID'] },
        deliveryDate: { gte: monthStart, lte: monthEnd },
      },
      include: { items: true },
      orderBy: { deliveryDate: 'asc' },
    }),
    prisma.payment.findMany({
      where: { customerId: id, receivedAt: { gte: monthStart, lte: monthEnd } },
      orderBy: { receivedAt: 'asc' },
    }),
  ]);

  const openingBalance = (priorCharges._sum.total ?? 0) - (priorPayments._sum.amount ?? 0);
  const monthCharges = orders.reduce((s, o) => s + o.total, 0);
  const monthPayments = payments.reduce((s, p) => s + p.amount, 0);
  const closingBalance = openingBalance + monthCharges - monthPayments;

  const entries = [
    ...orders.map((o) => ({
      date: o.deliveryDate,
      desc: `Delivery — ${o.items.map((i) => i.description ?? i.productType).join(', ')}`,
      charge: o.total,
      payment: 0,
    })),
    ...payments.map((p) => ({
      date: p.receivedAt,
      desc: `Payment — ${p.method}${p.reference ? ` (${p.reference})` : ''}`,
      charge: 0,
      payment: p.amount,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = openingBalance;

  return (
    <>
      <PageHeader
        title="Monthly statement"
        subtitle={`${customer.name} · ${format(monthStart, 'MMMM yyyy')}`}
        actions={
          <div className="no-print flex items-center gap-2">
            <a href={`?month=${format(addMonths(monthStart, -1), 'yyyy-MM')}`} className="btn-secondary">
              ← {format(addMonths(monthStart, -1), 'MMM')}
            </a>
            <a href={`?month=${format(addMonths(monthStart, 1), 'yyyy-MM')}`} className="btn-secondary">
              {format(addMonths(monthStart, 1), 'MMM')} →
            </a>
            <PrintButton />
          </div>
        }
      />

      <div className="card max-w-3xl p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-lg font-bold text-navy-900 dark:text-white">{config.businessName}</div>
            <div className="text-sm text-slate-500">Statement — {format(monthStart, 'MMMM yyyy')}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{customer.name}</div>
            <div className="text-slate-500">{customer.address}</div>
          </div>
        </div>

        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="text-right">Charge</th>
              <th className="text-right">Payment</th>
              <th className="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-medium">
              <td colSpan={4}>Opening balance</td>
              <td className="text-right tabular-nums">{money(openingBalance)}</td>
            </tr>
            {entries.map((e, i) => {
              running += e.charge - e.payment;
              return (
                <tr key={i}>
                  <td className="whitespace-nowrap">{shortDate(e.date)}</td>
                  <td className="text-slate-500">{e.desc}</td>
                  <td className="text-right tabular-nums">{e.charge ? money(e.charge) : ''}</td>
                  <td className="text-right tabular-nums text-emerald-600">
                    {e.payment ? `−${money(e.payment)}` : ''}
                  </td>
                  <td className="text-right tabular-nums">{money(running)}</td>
                </tr>
              );
            })}
            <tr className="text-base font-bold">
              <td colSpan={4}>Closing balance</td>
              <td className="text-right tabular-nums">{money(closingBalance)}</td>
            </tr>
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="mt-4 text-center text-sm text-slate-400">No activity this month.</p>
        )}
      </div>
    </>
  );
}
