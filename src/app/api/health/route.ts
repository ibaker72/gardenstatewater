import { NextResponse } from 'next/server';
import { getAppUrl, getOwnerEmail, getSupabaseEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { stripeConfigured } from '@/lib/stripe';
import { isOwner } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Connectivity/configuration check. Everyone gets ok/fail booleans; the
 * owner also gets the raw database error, which names the failing host and
 * credential problem. Never returns secret values.
 */
export async function GET() {
  let db: 'ok' | 'fail' = 'ok';
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    db = 'fail';
    dbError = e instanceof Error ? e.message : String(e);
  }

  const supabase = getSupabaseEnv();
  const owner = await isOwner().catch(() => false);
  return NextResponse.json(
    {
      db,
      ...(owner && dbError ? { dbError: dbError.slice(0, 2000) } : {}),
      env: {
        databaseUrlSet: Boolean(process.env.DATABASE_URL),
        directUrlSet: Boolean(process.env.DIRECT_URL),
        supabaseAuth: supabase.status,
        ...(supabase.status === 'invalid' ? { supabaseProblem: supabase.problem } : {}),
        ownerEmailSet: Boolean(getOwnerEmail()),
        stripeConfigured: stripeConfigured(),
        appUrl: getAppUrl(),
      },
    },
    { status: db === 'ok' ? 200 : 503 }
  );
}
