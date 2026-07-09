import Link from 'next/link';
import {
  AlertTriangle,
  Boxes,
  FileText,
  Map,
  Plus,
  Printer,
  Truck,
  UserPlus,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { endOfToday, startOfToday } from '@/lib/data';
import { getConfig } from '@/lib/pricing';
import {
  avgOrderValue,
  collectionRate,
  deliveryStreak,
  topCustomers,
  weeklyRevenue,
} from '@/lib/reports';
import { isoDate, money } from '@/lib/format';
import { PageHeader, StatCard } from '@/components/ui';
import { RevenueBarChart } from '@/components/charts';

export default async function DashboardPage() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [config, todayOrders, pendingCount, jugItem, lowConsumables, overdueInvoices, openRequests] =
    await Promise.all([
      getConfig(),
      prisma.order.findMany({
        where: { deliveryDate: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } },
        include: { items: true },
      }),
      prisma.order.count({ where: { status: 'SCHEDULED', deliveryDate: { lt: todayStart } } }),
      prisma.inventoryItem.findUnique({ where: { sku: 'JUG_5GAL' } }),
      prisma.inventoryItem.findMany({
        where: { sku: { not: 'JUG_5GAL' }, reorderThreshold: { gt: 0 } },
      }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.portalRequest.count({ where: { resolved: false } }),
    ]);

  const [revenue8w, best, aov, streak, collection, activeCustomers] = await Promise.all([
    weeklyRevenue(8),
    topCustomers(5),
    avgOrderValue(90),
    deliveryStreak(),
    collectionRate(90),
    prisma.customer.count({ where: { status: 'ACTIVE' } }),
  ]);

  const delivered = todayOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'PAID');
  const expectedToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const jugsOutToday = todayOrders.reduce(
    (s, o) => s + o.items.filter((i) => i.productType === 'JUG_REFILL').reduce((x, i) => x + i.quantity, 0),
    0
  );
  const jugsReturnedToday = delivered.reduce((s, o) => s + o.jugsReturned, 0);

  const lowJugs = jugItem && jugItem.quantity < config.lowStockThreshold;
  const lowItems = lowConsumables.filter((i) => i.quantity <= i.reorderThreshold);

  // Health score: customers (30) + streak (30) + collection (40)
  const score = Math.round(
    Math.min(activeCustomers / 50, 1) * 30 + Math.min(streak / 14, 1) * 30 + collection * 40
  );

  const quickActions = [
    { href: '/customers/new', label: 'Add customer', icon: UserPlus },
    { href: '/orders/new', label: 'New order', icon: Plus },
    { href: `/orders?date=${isoDate(new Date())}`, label: 'Log delivery', icon: Truck },
    { href: '/inventory', label: 'Add inventory', icon: Boxes },
    { href: '/invoices/new', label: 'Create invoice', icon: FileText },
    { href: `/routes?date=${isoDate(new Date())}`, label: "Today's route", icon: Map },
    { href: `/orders/delivery-sheet?date=${isoDate(new Date())}`, label: 'Delivery sheet', icon: Printer },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      {/* Alerts */}
      {(lowJugs || lowItems.length > 0 || overdueInvoices > 0 || pendingCount > 0 || openRequests > 0) && (
        <div className="mb-4 space-y-2">
          {lowJugs && (
            <Link href="/inventory" className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
              <AlertTriangle size={16} />
              Low jug stock: {jugItem!.quantity} left (threshold {config.lowStockThreshold}). Tap to restock.
            </Link>
          )}
          {lowItems.map((i) => (
            <Link key={i.id} href="/inventory" className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
              <AlertTriangle size={16} />
              {i.name} is low ({i.quantity} {i.unit}) — suggested reorder: {i.reorderAmount || i.reorderThreshold * 2}.
            </Link>
          ))}
          {overdueInvoices > 0 && (
            <Link href="/invoices?status=OVERDUE" className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-900 dark:bg-red-900/30 dark:text-red-100">
              <AlertTriangle size={16} />
              {overdueInvoices} overdue invoice{overdueInvoices === 1 ? ' needs' : 's need'} attention.
            </Link>
          )}
          {openRequests > 0 && (
            <Link href="/requests" className="flex items-center gap-2 rounded-lg bg-aqua-50 px-4 py-2.5 text-sm text-aqua-900 dark:bg-aqua-900/30 dark:text-aqua-100">
              <AlertTriangle size={16} />
              {openRequests} customer request{openRequests === 1 ? '' : 's'} from the portal.
            </Link>
          )}
          {pendingCount > 0 && (
            <Link href="/orders?status=SCHEDULED" className="flex items-center gap-2 rounded-lg bg-aqua-50 px-4 py-2.5 text-sm text-aqua-900 dark:bg-aqua-900/30 dark:text-aqua-100">
              <Truck size={16} />
              {pendingCount} past order{pendingCount === 1 ? '' : 's'} still marked scheduled.
            </Link>
          )}
        </div>
      )}

      {/* Daily overview */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Today's deliveries" value={`${delivered.length}/${todayOrders.length}`} sub="done / scheduled" />
        <StatCard label="Expected revenue" value={money(expectedToday)} sub="today" />
        <StatCard label="Jugs out" value={jugsOutToday} sub="going out today" />
        <StatCard label="Jugs returned" value={jugsReturnedToday} sub="empties collected" />
        <StatCard
          label="Jugs in stock"
          value={jugItem?.quantity ?? '—'}
          tone={lowJugs ? 'warn' : 'default'}
          sub={lowJugs ? 'below threshold!' : 'ready to deliver'}
        />
      </div>

      {/* Quick actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {quickActions.map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href} className="btn-secondary">
            <Icon size={15} /> {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Weekly revenue</h2>
            <Link href="/reports" className="text-sm text-aqua-600 hover:underline">
              Full reports →
            </Link>
          </div>
          <RevenueBarChart data={revenue8w} />
          <p className="mt-2 text-xs text-slate-400">
            Avg order value {money(aov.avg)} across {aov.count} orders (90 days).
          </p>
        </div>

        {/* Health + best customers */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Business health</h2>
            <div className="mb-2 flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums">{score}</span>
              <span className="pb-1 text-sm text-slate-400">/ 100</span>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
              <div
                className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Active customers</dt>
                <dd className="font-medium tabular-nums">{activeCustomers}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Delivery streak</dt>
                <dd className="font-medium tabular-nums">{streak} day{streak === 1 ? '' : 's'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Collection rate (90d)</dt>
                <dd className="font-medium tabular-nums">{Math.round(collection * 100)}%</dd>
              </div>
            </dl>
          </div>

          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Best customers</h2>
            <ol className="space-y-1.5 text-sm">
              {best.map((b, i) => (
                <li key={b.customerId} className="flex items-center justify-between">
                  <Link href={`/customers/${b.customerId}`} className="truncate hover:underline">
                    <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                    {b.name}
                  </Link>
                  <span className="font-medium tabular-nums">{money(b.revenue)}</span>
                </li>
              ))}
              {best.length === 0 && <li className="text-slate-400">No revenue yet.</li>}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
