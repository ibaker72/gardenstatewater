'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Palette validated (dataviz six checks) on white and #0f2744 surfaces.
export const CHART = {
  series1: '#1c94bd', // aqua — slot 1
  series2: '#d97706', // amber — slot 2
  ink: '#64748b', // axis/label text token, legible on both surfaces
  grid: '#94a3b8',
};

const axisProps = {
  stroke: CHART.ink,
  tick: { fill: CHART.ink, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(15, 39, 68, 0.95)',
    border: 'none',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 12,
  },
  cursor: { fill: 'rgba(148, 163, 184, 0.12)' },
} as const;

const fmtMoney = (v: number) => `$${v.toLocaleString()}`;

export function RevenueBarChart({
  data,
  height = 240,
}: {
  data: { label: string; revenue: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeOpacity={0.2} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={fmtMoney} width={56} />
        <Tooltip {...tooltipStyle} formatter={(v) => [fmtMoney(Number(v)), 'Revenue']} />
        <Bar dataKey="revenue" fill={CHART.series1} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VolumeLineChart({
  data,
  height = 240,
}: {
  data: { label: string; deliveries: number; jugs: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeOpacity={0.2} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={36} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.ink }} iconType="plainline" />
        <Line
          type="monotone"
          dataKey="jugs"
          name="Jugs delivered"
          stroke={CHART.series1}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="deliveries"
          name="Deliveries"
          stroke={CHART.series2}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SingleLineChart({
  data,
  dataKey,
  name,
  height = 240,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  name: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeOpacity={0.2} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={40} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={CHART.series1}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GrowthBarChart({
  data,
  height = 240,
}: {
  data: { label: string; new: number; churned: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%" barGap={2}>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeOpacity={0.2} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={32} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.ink }} />
        <Bar dataKey="new" name="New customers" fill={CHART.series1} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="churned" name="Churned" fill={CHART.series2} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
