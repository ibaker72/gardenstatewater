import { NextRequest, NextResponse } from 'next/server';
import { runDailyAutomation } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily automation endpoint, hit by Vercel Cron (see vercel.json).
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically when the
 * CRON_SECRET env var is set on the project.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const result = await runDailyAutomation();
  return NextResponse.json({ ok: true, ...result });
}
