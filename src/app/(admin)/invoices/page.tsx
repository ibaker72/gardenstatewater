import Link from 'next/link';
import { Plus, Send } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { money, shortDate, timeAgoDays } from '@/lib/format';
import { sendPaymentReminder } from '@/server/actions/invoices';
import { Badge, EmptyState, INVOICE_STATUS_TONE, LinkButton, PageHeader, StatCard } from '@/components/ui';
import type { Prisma } from '@prisma/client';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; customer?: string };
}) {
  const where: Prisma.InvoiceWhereInput = {};
  if (searchParams.status) where.status = searchParams.status as never;
  if (searchParams.customer) where.customerId = searchParams.customer;

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: true },
    orderBy: { issueDate: 'desc' },
    take: 200,
  });

  const open = invoices.filter((i) => !['PAID', 'VOID', 'DRAFT'].includes(i.status));
  const outstanding = open.reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const now = Date.now();
  const aging = {
    d7: open.filter((i) => now - i.dueDate.getTime() > 7 * 86_400_000),
    d14: open.filter((i) => now - i.dueDate.getTime() > 14 * 86_400_000),
    d30: open.filter((i) => now - i.dueDate.getTime() > 30 * 86_400_000),
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Who owes what, and for how long."
        actions={
          <LinkButton href="/invoices/new">
            <Plus size={16} /> New invoice
          </LinkButton>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Outstanding" value={money(outstanding)} tone={outstanding > 0 ? 'warn' : 'good'} sub={`${open.length} open invoices`} />
        <StatCard label="7+ days late" value={aging.d7.length} tone={aging.d7.length ? 'warn' : 'default'} />
        <StatCard label="14+ days late" value={aging.d14.length} tone={aging.d14.length ? 'warn' : 'default'} />
        <StatCard label="30+ days late" value={aging.d30.length} tone={aging.d30.length ? 'bad' : 'default'} />
      </div>

      <form className="card mb-4 flex flex-wrap items-end gap-2 p-3" method="GET">
        <div className="min-w-40">
          <label className="label">Status</label>
          <select name="status" defaultValue={searchParams.status ?? ''} className="input">
            <option value="">All</option>
            {['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">Filter</button>
      </form>

      {invoices.length === 0 ? (
        <EmptyState title="No invoices" hint="Deliver some orders, then bundle them into an invoice." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Issued</th>
                <th>Due</th>
                <th className="text-right">Total</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const balance = inv.total - inv.amountPaid;
                const overdueDays = timeAgoDays(inv.dueDate) ?? 0;
                const isLate = balance > 0 && overdueDays > 0 && !['PAID', 'VOID', 'DRAFT'].includes(inv.status);
                const remind = sendPaymentReminder.bind(null, inv.id);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                    <td>
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-navy-700 hover:underline dark:text-aqua-300">
                        #{inv.number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/customers/${inv.customerId}`} className="hover:underline">
                        {inv.customer.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-slate-500">{shortDate(inv.issueDate)}</td>
                    <td className="whitespace-nowrap">
                      {shortDate(inv.dueDate)}
                      {isLate && <span className="ml-1 text-xs text-red-500">+{overdueDays}d</span>}
                    </td>
                    <td className="text-right tabular-nums">{money(inv.total)}</td>
                    <td className={`text-right font-medium tabular-nums ${balance > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {money(balance)}
                    </td>
                    <td>
                      <Badge tone={INVOICE_STATUS_TONE[inv.status]}>{inv.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="no-print">
                      {isLate && inv.customer.email && (
                        <form action={remind}>
                          <button className="inline-flex items-center gap-1 text-xs text-aqua-600 hover:underline" title="Send payment reminder">
                            <Send size={12} /> Remind
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
