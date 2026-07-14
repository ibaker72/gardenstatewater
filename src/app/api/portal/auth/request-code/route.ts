import { NextRequest, NextResponse } from 'next/server';
import { requestLoginCode } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

/**
 * Sends a 6-digit sign-in code. The response is deliberately identical
 * whether or not the identifier matches an account (and when rate-limited),
 * so this endpoint can't be used to probe which phone numbers/emails exist.
 */
export async function POST(req: NextRequest) {
  let identifier = '';
  try {
    ({ identifier = '' } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return NextResponse.json({ error: 'Enter your phone number or email.' }, { status: 400 });
  }

  await requestLoginCode(identifier).catch((e) => {
    console.error(`[portal-auth] request-code failed: ${e instanceof Error ? e.message : e}`);
  });

  return NextResponse.json({ sent: true });
}
