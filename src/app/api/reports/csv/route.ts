import { NextRequest, NextResponse } from 'next/server';
import {
  customerGrowth,
  deliveryVolume,
  monthlyRevenue,
  profitAndLoss,
  routeEfficiency,
  topCustomers,
  weeklyRevenue,
} from '@/lib/reports';
import { isOwner } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

export async function GET(req: NextRequest) {
  if (!(await isOwner())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get('type') ?? 'revenue';

  let rows: Record<string, unknown>[] = [];
  switch (type) {
    case 'revenue':
      rows = await weeklyRevenue(26);
      break;
    case 'revenue-monthly':
      rows = await monthlyRevenue(12);
      break;
    case 'customers':
      rows = await topCustomers(50);
      break;
    case 'volume':
      rows = await deliveryVolume(26);
      break;
    case 'growth':
      rows = await customerGrowth(12);
      break;
    case 'efficiency':
      rows = (await routeEfficiency(30)).map((r) => ({
        ...r,
        date: r.date.toISOString().slice(0, 10),
      }));
      break;
    case 'pnl':
      rows = [await profitAndLoss(30)];
      break;
    default:
      return NextResponse.json({ error: 'unknown report type' }, { status: 400 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gsw-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
