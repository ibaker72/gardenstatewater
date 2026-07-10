import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isOwner } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Connectivity check. Everyone gets ok/fail; the owner also gets the raw
 * database error, which names the failing host and credential problem.
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

  const owner = await isOwner();
  return NextResponse.json(
    {
      db,
      ...(owner && dbError ? { dbError: dbError.slice(0, 2000) } : {}),
      env: {
        databaseUrlSet: Boolean(process.env.DATABASE_URL),
        directUrlSet: Boolean(process.env.DIRECT_URL),
        supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        ownerEmailSet: Boolean((process.env.OWNER_EMAIL ?? '').trim()),
      },
    },
    { status: db === 'ok' ? 200 : 503 }
  );
}
