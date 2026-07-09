import { addDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { isoDate, money } from '@/lib/format';
import { createInvoice } from '@/server/actions/invoices';
import { PageHeader } from '@/components/ui';

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { customer?: string; error?: string };
}) {
  // Customers with delivered-but-uninvoiced orders, plus what they'd be billed.
  const uninvoiced = await prisma.order.groupBy({
    by: ['customerId'],
    where: { invoiceId: null, status: 'DELIVERED' },
    _sum: { total: true },
    _count: { _all: true },
  });
  const customers = await prisma.customer.findMany({
    where: { id: { in: uninvoiced.map((u) => u.customerId) } },
    orderBy: { name: 'asc' },
  });
  const amounts = new Map(uninvoiced.map((u) => [u.customerId, { total: u._sum.total ?? 0, count: u._count._all }]));

  return (
    <>
      <PageHeader
        title="New invoice"
        subtitle="Bundles all delivered, not-yet-invoiced orders for the customer."
      />
      {searchParams.error === 'noorders' && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          That customer has no uninvoiced delivered orders.
        </p>
      )}
      {customers.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          Nothing to invoice — every delivered order is already invoiced or paid.
        </div>
      ) : (
        <form action={createInvoice} className="card max-w-xl space-y-4 p-4 md:p-6">
          <div>
            <label className="label">Customer *</label>
            <select name="customerId" required defaultValue={searchParams.customer ?? ''} className="input">
              <option value="" disabled>
                Select customer…
              </option>
              {customers.map((c) => {
                const a = amounts.get(c.id)!;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} — {a.count} order{a.count === 1 ? '' : 's'}, {money(a.total)}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="label">Due date *</label>
            <input type="date" name="dueDate" required defaultValue={isoDate(addDays(new Date(), 14))} className="input" />
          </div>
          <div>
            <label className="label">Memo</label>
            <input name="memo" className="input" placeholder="Optional note shown on the invoice" />
          </div>
          <button className="btn-primary w-full md:w-auto">Create invoice</button>
        </form>
      )}
    </>
  );
}
