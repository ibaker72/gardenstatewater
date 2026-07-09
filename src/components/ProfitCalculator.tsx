'use client';

import { useState } from 'react';
import { profitCalc, type ProfitInput } from '@/lib/pricing-core';
import { money } from '@/lib/format';

export function ProfitCalculator({
  defaults,
}: {
  defaults: { costPerGallon: number; gasCostPerMile: number; laborCostPerHour: number; avgRevenuePerJug: number };
}) {
  const [input, setInput] = useState<ProfitInput>({
    costPerGallon: defaults.costPerGallon,
    jugsPerWeek: 60,
    avgRevenuePerJug: defaults.avgRevenuePerJug,
    milesPerWeek: 120,
    gasCostPerMile: defaults.gasCostPerMile,
    hoursPerWeek: 15,
    laborCostPerHour: defaults.laborCostPerHour,
    fixedWeeklyCosts: 40,
    weeklyProfitGoal: 1000,
  });

  const out = profitCalc(input);
  const set = (k: keyof ProfitInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput((s) => ({ ...s, [k]: Number(e.target.value) || 0 }));

  const fields: Array<{ key: keyof ProfitInput; label: string; step?: string }> = [
    { key: 'jugsPerWeek', label: 'Jugs delivered / week' },
    { key: 'avgRevenuePerJug', label: 'Avg revenue per jug ($)', step: '0.25' },
    { key: 'costPerGallon', label: 'Supplier cost per gallon ($)', step: '0.01' },
    { key: 'milesPerWeek', label: 'Miles driven / week' },
    { key: 'gasCostPerMile', label: 'Gas cost per mile ($)', step: '0.01' },
    { key: 'hoursPerWeek', label: 'Hours / week' },
    { key: 'laborCostPerHour', label: 'Your hourly cost ($)', step: '1' },
    { key: 'fixedWeeklyCosts', label: 'Fixed weekly costs ($)', step: '5' },
    { key: 'weeklyProfitGoal', label: 'Weekly profit goal ($)', step: '50' },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input
              type="number"
              step={f.step ?? '1'}
              value={input[f.key]}
              onChange={set(f.key)}
              className="input"
            />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-navy-800/50">
            <div className="text-xs text-slate-500">Weekly revenue</div>
            <div className="text-xl font-bold tabular-nums">{money(out.revenuePerWeek)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-navy-800/50">
            <div className="text-xs text-slate-500">Water cost</div>
            <div className="text-xl font-bold tabular-nums">{money(out.cogsPerWeek)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-navy-800/50">
            <div className="text-xs text-slate-500">Gross profit</div>
            <div className="text-xl font-bold tabular-nums">{money(out.grossProfit)}</div>
          </div>
          <div className={`rounded-lg p-3 ${out.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
            <div className="text-xs text-slate-500">Net profit / week</div>
            <div className={`text-xl font-bold tabular-nums ${out.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {money(out.netProfit)}
            </div>
            <div className="text-xs text-slate-500">{out.marginPct}% margin</div>
          </div>
        </div>
        <div className="rounded-lg border border-aqua-200 bg-aqua-50 p-4 text-sm text-aqua-900 dark:border-aqua-800 dark:bg-aqua-900/30 dark:text-aqua-100">
          <p>
            Each jug nets you <strong>{money(out.profitPerJug)}</strong> after water cost. You break even at{' '}
            <strong>{out.breakEvenJugs} jugs/week</strong>.
          </p>
          <p className="mt-2">
            At current volume you make <strong>{money(out.netProfit)}/week</strong>. To hit{' '}
            <strong>{money(input.weeklyProfitGoal)}/week</strong> you need{' '}
            <strong>{out.jugsNeededForGoal} jugs/week</strong> — roughly{' '}
            <strong>{out.customersNeededForGoal} customers</strong> at 2 jugs each.
          </p>
        </div>
      </div>
    </div>
  );
}
