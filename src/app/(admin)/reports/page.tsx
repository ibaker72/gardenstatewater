import Link from 'next/link';
import { Download } from 'lucide-react';
import {
  customerGrowth,
  deliveryVolume,
  jugInventoryTrend,
  monthlyRevenue,
  profitAndLoss,
  routeEfficiency,
  topCustomers,
  weeklyRevenue,
} from '@/lib/reports';
import { money, shortDate } from '@/lib/format';
import { PageHeader, StatCard } from '@/components/ui';
import {
  GrowthBarChart,
  RevenueBarChart,
  SingleLineChart,
  VolumeLineChart,
} from '@/components/charts';
import { PrintButton } from '@/components/PrintButton';

function CsvLink({ type }: { type: string }) {
  return (
    <a
      href={`/api/reports/csv?type=${type}`}
      className="no-print inline-flex items-center gap-1 text-xs text-aqua-600 hover:underline"
      download
    >
      <Download size={12} /> CSV
    </a>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range = searchParams.range === 'month' ? 'month' : searchParams.range === 'quarter' ? 'quarter' : 'week';

  const [revWeekly, revMonthly, volume, growth, top10, efficiency, pnl, jugTrend] =
    await Promise.all([
      weeklyRevenue(range === 'quarter' ? 13 : 8),
      monthlyRevenue(range === 'quarter' ? 12 : 6),
      deliveryVolume(12),
      customerGrowth(6),
      topCustomers(10),
      routeEfficiency(10),
      profitAndLoss(30),
      jugInventoryTrend(12),
    ]);

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        subtitle="Everything exports to CSV; use Print for a PDF."
        actions={<PrintButton />}
      />

      {/* Range tabs */}
      <div className="no-print mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-navy-900 md:w-fit">
        {(['week', 'month', 'quarter'] as const).map((r) => (
          <Link
            key={r}
            href={`/reports?range=${r}`}
            className={`flex-1 rounded-md px-4 py-1.5 text-center capitalize md:flex-none ${
              range === r ? 'bg-white font-medium shadow-sm dark:bg-navy-700' : 'text-slate-500'
            }`}
          >
            By {r}
          </Link>
        ))}
      </div>

      {/* P&L summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Revenue (30d)" value={money(pnl.revenue)} />
        <StatCard label="Water cost" value={money(pnl.cogs)} sub={`${pnl.jugs} jugs`} />
        <StatCard label="Fuel estimate" value={money(pnl.fuel)} sub={`${Math.round(pnl.miles)} mi`} />
        <StatCard
          label="Net (30d)"
          value={money(pnl.net)}
          tone={pnl.net >= 0 ? 'good' : 'bad'}
        />
        <div className="card flex items-center justify-center px-4 py-3.5">
          <CsvLink type="pnl" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">{range === 'week' ? 'Weekly revenue' : 'Monthly revenue'}</h2>
            <CsvLink type={range === 'week' ? 'revenue' : 'revenue-monthly'} />
          </div>
          <RevenueBarChart data={range === 'week' ? revWeekly : revMonthly} />
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Delivery volume</h2>
            <CsvLink type="volume" />
          </div>
          <VolumeLineChart data={volume} />
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Customer growth</h2>
            <CsvLink type="growth" />
          </div>
          <GrowthBarChart data={growth} />
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Jug stock trend</h2>
            <span className="text-xs text-slate-400">reconstructed from movements</span>
          </div>
          <SingleLineChart data={jugTrend} dataKey="stock" name="Jugs in stock" />
        </div>

        <div className="card overflow-x-auto p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Top 10 customers</h2>
            <CsvLink type="customers" />
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>Customer</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((c) => (
                <tr key={c.customerId}>
                  <td>
                    <Link href={`/customers/${c.customerId}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{c.orders}</td>
                  <td className="text-right font-medium tabular-nums">{money(c.revenue)}</td>
                </tr>
              ))}
              {top10.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card overflow-x-auto p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Route efficiency</h2>
            <CsvLink type="efficiency" />
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Stops</th>
                <th className="text-right">Miles</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">$/mile</th>
              </tr>
            </thead>
            <tbody>
              {efficiency.map((r, i) => (
                <tr key={i}>
                  <td>{shortDate(r.date)}</td>
                  <td className="text-right tabular-nums">{r.stops}</td>
                  <td className="text-right tabular-nums">{r.miles.toFixed(1)}</td>
                  <td className="text-right tabular-nums">{money(r.revenue)}</td>
                  <td className="text-right font-medium tabular-nums">
                    {r.revenuePerMile !== null ? money(r.revenuePerMile) : '—'}
                  </td>
                </tr>
              ))}
              {efficiency.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    Build routes to see efficiency stats.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
