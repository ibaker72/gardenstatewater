import Link from 'next/link';
import { CalendarDays, Plus, Printer } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { isoDate, money, shortDate, STATUS_LABELS } from '@/lib/format';
import { generateSubscriptionOrders } from '@/server/actions/orders';
import { Badge, EmptyState, LinkButton, ORDER_STATUS_TONE, PageHeader } from '@/components/ui';
import type { Prisma } from '@prisma/client';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { date?: string; status?: string; customer?: string; generated?: string };
}) {
  const { date, status, customer, generated } = searchParams;

  const where: Prisma.OrderWhereInput = {};
  if (date) where.deliveryDate = new Date(date + 'T00:00:00');
  if (status) where.status = status as never;
  if (customer) where.customerId = customer;

  const orders = await prisma.order.findMany({
    where,
    include: { customer: { include: { zone: true } }, items: true },
    orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  const today = isoDate(new Date());

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'} shown`}
        actions={
          <>
            <LinkButton href={`/orders/delivery-sheet?date=${date ?? today}`} variant="secondary">
              <Printer size={15} /> Delivery sheet
            </LinkButton>
            <LinkButton href="/orders/new">
              <Plus size={16} /> New order
            </LinkButton>
          </>
        }
      />

      {generated !== undefined && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          Generated {generated} subscription order{generated === '1' ? '' : 's'}.
        </p>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <form className="card flex flex-wrap items-end gap-2 p-3" method="GET">
          <div className="min-w-36 flex-1">
            <label className="label">Delivery date</label>
            <input type="date" name="date" defaultValue={date} className="input" />
          </div>
          <div className="min-w-36 flex-1">
            <label className="label">Status</label>
            <select name="status" defaultValue={status ?? ''} className="input">
              <option value="">All</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-secondary">Filter</button>
        </form>

        <form action={generateSubscriptionOrders} className="card flex flex-wrap items-end gap-2 p-3">
          <div className="min-w-36 flex-1">
            <label className="label">
              <CalendarDays size={12} className="mr-1 inline" />
              Generate subscription orders for…
            </label>
            <input type="date" name="date" defaultValue={today} required className="input" />
          </div>
          <button className="btn-primary">Generate</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders match"
          hint="Create one manually or generate the day's subscription deliveries."
          action={<LinkButton href="/orders/new">New order</LinkButton>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th className="text-right">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                  <td>
                    <Link href={`/orders/${o.id}`} className="font-medium text-navy-700 hover:underline dark:text-aqua-300">
                      #{o.number}
                    </Link>
                    {o.fromSubscription && <span className="ml-1 text-xs text-slate-400">sub</span>}
                  </td>
                  <td>
                    <Link href={`/customers/${o.customerId}`} className="hover:underline">
                      {o.customer.name}
                    </Link>
                    <div className="text-xs text-slate-500">{o.customer.zone?.name ?? ''}</div>
                  </td>
                  <td className="whitespace-nowrap">{shortDate(o.deliveryDate)}</td>
                  <td className="max-w-64 truncate text-slate-500">
                    {o.items.map((i) => `${i.quantity}× ${i.productType === 'JUG_REFILL' ? 'refill' : i.productType.toLowerCase().replace('_', ' ')}`).join(', ')}
                  </td>
                  <td className="text-right font-medium tabular-nums">{money(o.total)}</td>
                  <td>
                    <Badge tone={ORDER_STATUS_TONE[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
