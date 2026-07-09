import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { customerBalances, isAtRisk, lastDeliveryDates } from '@/lib/data';
import { money, PLAN_LABELS, shortDate } from '@/lib/format';
import { Badge, EmptyState, LinkButton, PageHeader } from '@/components/ui';
import type { Prisma } from '@prisma/client';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; zone?: string; plan?: string; status?: string; filter?: string };
}) {
  const { q, zone, plan, status, filter } = searchParams;

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (zone) where.zoneId = zone;
  if (plan) where.plan = plan as never;
  if (status) where.status = status as never;

  const [customers, zones] = await Promise.all([
    prisma.customer.findMany({ where, include: { zone: true }, orderBy: { name: 'asc' } }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const ids = customers.map((c) => c.id);
  const [balances, lastDeliveries] = await Promise.all([
    customerBalances(ids),
    lastDeliveryDates(ids),
  ]);

  let rows = customers.map((c) => ({
    ...c,
    balance: balances.get(c.id) ?? 0,
    lastDelivery: lastDeliveries.get(c.id),
    atRisk: c.status === 'ACTIVE' && isAtRisk(lastDeliveries.get(c.id), c.createdAt),
  }));
  if (filter === 'owing') rows = rows.filter((r) => r.balance > 0);
  if (filter === 'atrisk') rows = rows.filter((r) => r.atRisk);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} shown · ${customers.filter((c) => c.status === 'ACTIVE').length} active total`}
        actions={
          <LinkButton href="/customers/new">
            <Plus size={16} /> Add customer
          </LinkButton>
        }
      />

      <form className="card mb-4 grid gap-2 p-3 md:grid-cols-5" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, address, phone…"
          className="input md:col-span-2"
        />
        <select name="zone" defaultValue={zone ?? ''} className="input">
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <select name="plan" defaultValue={plan ?? ''} className="input">
          <option value="">All plans</option>
          <option value="WEEKLY">Weekly</option>
          <option value="BIWEEKLY">Bi-weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="ON_DEMAND">On-demand</option>
        </select>
        <div className="flex gap-2">
          <select name="filter" defaultValue={filter ?? ''} className="input">
            <option value="">Everyone</option>
            <option value="owing">Owes money</option>
            <option value="atrisk">At risk</option>
          </select>
          <button className="btn-secondary shrink-0">Filter</button>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No customers found"
          hint="Add your first customer to get rolling."
          action={<LinkButton href="/customers/new">Add customer</LinkButton>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Zone</th>
                <th>Plan</th>
                <th className="text-right">Jugs out</th>
                <th className="text-right">Balance</th>
                <th>Last delivery</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/40">
                  <td>
                    <Link href={`/customers/${c.id}`} className="font-medium text-navy-700 hover:underline dark:text-aqua-300">
                      {c.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {c.address}
                      {c.city ? `, ${c.city}` : ''}
                    </div>
                  </td>
                  <td>{c.zone?.name ?? '—'}</td>
                  <td>{PLAN_LABELS[c.plan]}</td>
                  <td className="text-right tabular-nums">{c.jugsWithCustomer}</td>
                  <td className={`text-right font-medium tabular-nums ${c.balance > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {money(c.balance)}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">{shortDate(c.lastDelivery)}</td>
                  <td>
                    <div className="flex gap-1">
                      {c.atRisk && <Badge tone="amber">At risk</Badge>}
                      {c.status === 'SUSPENDED' && <Badge tone="red">Suspended</Badge>}
                      {c.status === 'PAUSED' && <Badge tone="slate">Paused</Badge>}
                      {c.accountType === 'COMMERCIAL' && <Badge tone="navy">Commercial</Badge>}
                    </div>
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
