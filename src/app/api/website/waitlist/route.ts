import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const csvField = (value: string | null) => {
  const v = value ?? '';
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

/**
 * Waitlist CSV export for Settings → Website. The /api/website path is not in
 * the middleware's public list, so only the authenticated owner reaches this.
 */
export async function GET() {
  const entries = await prisma.waitlist.findMany({ orderBy: { createdAt: 'desc' } });
  const header = 'name,phone,email,zip,town,contacted,signed_up';
  const rows = entries.map((entry: typeof entries[number]) =>
    [
      csvField(entry.name),
      csvField(entry.phone),
      csvField(entry.email),
      csvField(entry.zip),
      csvField(entry.town),
      entry.contacted ? 'yes' : 'no',
      entry.createdAt.toISOString().slice(0, 10),
    ].join(',')
  );
  return new NextResponse([header, ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
