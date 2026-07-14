import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession, verifyLoginCode } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  invalid: "That code didn't match — double-check it and try again.",
  expired: 'That code expired. Tap "Send a new code" to get another one.',
  'too-many-attempts': 'Too many tries. Request a fresh code and try again.',
};

export async function POST(req: NextRequest) {
  let identifier = '';
  let code = '';
  try {
    ({ identifier = '', code = '' } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!identifier.trim() || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: 'Enter the 6-digit code from your message.' }, { status: 400 });
  }

  const result = await verifyLoginCode(identifier, code);
  if (!result.ok) {
    return NextResponse.json({ error: MESSAGES[result.reason] }, { status: 401 });
  }

  await createPortalSession(result.customer.id);
  return NextResponse.json({ ok: true, next: `/portal/${result.customer.portalToken}` });
}
