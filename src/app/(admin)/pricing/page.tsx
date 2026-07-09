import { Trash2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getConfig, planDiscountPct, round2, suggestedPrice } from '@/lib/pricing';
import { money } from '@/lib/format';
import { deleteCompetitor, updateConfig, upsertCompetitor } from '@/server/actions/pricing';
import { PageHeader } from '@/components/ui';
import { ProfitCalculator } from '@/components/ProfitCalculator';

export default async function PricingPage() {
  const [config, competitors] = await Promise.all([
    getConfig(),
    prisma.competitorPrice.findMany({ orderBy: { competitor: 'asc' } }),
  ]);

  const suggested = suggestedPrice(config.costPerGallon, config.targetMarginPct);
  const avgRevenuePerJug = round2(
    config.jugRefillPrice * (1 - planDiscountPct(config, 'WEEKLY') / 100 / 2) // rough blended rate
  );

  const rows: Array<{ label: string; key: 'jugRefill' | 'jugPurchase' | 'dispenserRent' | 'bottleCase' | 'deliveryFee'; mine: number }> = [
    { label: '5-gal refill', key: 'jugRefill', mine: config.jugRefillPrice },
    { label: 'New 5-gal jug', key: 'jugPurchase', mine: config.jugPurchasePrice },
    { label: 'Dispenser rental /mo', key: 'dispenserRent', mine: config.dispenserRentalPrice },
    { label: '16oz bottle case', key: 'bottleCase', mine: config.bottleCasePrice },
    { label: 'Delivery fee (flat)', key: 'deliveryFee', mine: config.flatDeliveryFee },
  ];

  return (
    <>
      <PageHeader title="Pricing engine" subtitle="Every price below flows into new orders automatically." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Base pricing */}
        <form action={updateConfig} className="card space-y-4 p-4">
          <h2 className="font-semibold">Base pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['jugRefillPrice', '5-gal refill ($)', config.jugRefillPrice],
              ['jugPurchasePrice', 'New jug ($)', config.jugPurchasePrice],
              ['dispenserRentalPrice', 'Dispenser rental ($/mo)', config.dispenserRentalPrice],
              ['bottleCasePrice', '16oz bottle case ($)', config.bottleCasePrice],
              ['flatDeliveryFee', 'Flat delivery fee ($)', config.flatDeliveryFee],
              ['costPerGallon', 'Supplier cost/gallon ($)', config.costPerGallon],
            ].map(([name, label, value]) => (
              <div key={name as string}>
                <label className="label">{label}</label>
                <input type="number" step="0.01" name={name as string} defaultValue={value as number} className="input" />
              </div>
            ))}
          </div>
          <h3 className="pt-1 text-sm font-semibold">Subscription discounts (% off refills)</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['weeklyDiscountPct', 'Weekly', config.weeklyDiscountPct],
              ['biweeklyDiscountPct', 'Bi-weekly', config.biweeklyDiscountPct],
              ['monthlyDiscountPct', 'Monthly', config.monthlyDiscountPct],
            ].map(([name, label, value]) => (
              <div key={name as string}>
                <label className="label">{label}</label>
                <input type="number" step="0.5" name={name as string} defaultValue={value as number} className="input" />
              </div>
            ))}
          </div>
          <h3 className="pt-1 text-sm font-semibold">Bulk deal</h3>
          <div className="flex items-center gap-2 text-sm">
            Buy
            <input type="number" name="bulkBuyQty" defaultValue={config.bulkBuyQty} className="input w-20" />
            jugs, get
            <input type="number" name="bulkFreeQty" defaultValue={config.bulkFreeQty} className="input w-20" />
            free
          </div>
          <div>
            <label className="label">Target margin % (drives suggested pricing)</label>
            <input type="number" step="1" name="targetMarginPct" defaultValue={config.targetMarginPct} className="input w-32" />
          </div>
          <button className="btn-primary">Save pricing</button>
        </form>

        {/* Competitor comparison */}
        <div className="card space-y-4 p-4">
          <h2 className="font-semibold">Competitor comparison</h2>
          <div className="overflow-x-auto">
            <table className="table-base min-w-[480px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">You</th>
                  {competitors.map((c) => (
                    <th key={c.id} className="text-right">
                      {c.competitor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cheapest = Math.min(
                    ...[r.mine, ...competitors.map((c) => c[r.key] ?? Infinity)].filter((v) => v !== null)
                  );
                  return (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      <td className={`text-right tabular-nums ${r.mine <= cheapest ? 'font-bold text-emerald-600' : ''}`}>
                        {money(r.mine)}
                      </td>
                      {competitors.map((c) => (
                        <td key={c.id} className="text-right tabular-nums text-slate-500">
                          {c[r.key] !== null ? money(c[r.key]!) : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="rounded-lg bg-aqua-50 px-3 py-2 text-sm text-aqua-900 dark:bg-aqua-900/30 dark:text-aqua-100">
            💡 At {money(config.costPerGallon)}/gallon cost and a {config.targetMarginPct}% target margin, your
            suggested refill price is <strong>{money(suggested)}</strong>
            {suggested > config.jugRefillPrice
              ? ` — you have ${money(suggested - config.jugRefillPrice)} of headroom.`
              : ' — your current price already meets the goal.'}
          </p>

          <details>
            <summary className="cursor-pointer text-sm font-medium text-aqua-600">Add / edit competitor</summary>
            <form action={upsertCompetitor} className="mt-3 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Competitor name</label>
                <input name="competitor" required className="input" placeholder="Culligan, ReadyRefresh…" />
              </div>
              {[
                ['jugRefill', 'Refill $'],
                ['jugPurchase', 'New jug $'],
                ['dispenserRent', 'Dispenser $/mo'],
                ['bottleCase', 'Bottle case $'],
                ['deliveryFee', 'Delivery fee $'],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="label">{label}</label>
                  <input type="number" step="0.01" name={name} className="input" />
                </div>
              ))}
              <div className="col-span-2">
                <button className="btn-secondary w-full">Save competitor</button>
              </div>
            </form>
            {competitors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {competitors.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span>{c.competitor}</span>
                    <form
                      action={async () => {
                        'use server';
                        await deleteCompetitor(c.id);
                      }}
                    >
                      <button className="p-1 text-slate-400 hover:text-red-600" aria-label={`Delete ${c.competitor}`}>
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
      </div>

      {/* Profit calculator */}
      <div className="card mt-4 p-4">
        <h2 className="mb-1 font-semibold">Profit calculator</h2>
        <p className="mb-4 text-sm text-slate-500">
          Play with the numbers — nothing here is saved, defaults come from your pricing config.
        </p>
        <ProfitCalculator
          defaults={{
            costPerGallon: config.costPerGallon,
            gasCostPerMile: config.gasCostPerMile,
            laborCostPerHour: config.laborCostPerHour,
            avgRevenuePerJug,
          }}
        />
      </div>
    </>
  );
}
