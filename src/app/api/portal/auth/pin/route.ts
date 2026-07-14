import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession, verifyPin } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let identifier = '';
  let pin = '';
  try {
    ({ identifier = '', pin = '' } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!identifier.trim() || !/^\d{4}$/.test(pin.trim())) {
    return NextResponse.json(
      { error: 'Enter your phone number (or email) and your 4-digit PIN.' },
      { status: 400 }
    );
  }

  const result = await verifyPin(identifier, pin);
  if (!result.ok) {
    const error =
      result.reason === 'too-many-attempts'
        ? 'Too many tries — wait a bit and try again, or text us for help.'
        : "That didn't match. Check your PIN, or sign in with a texted code instead.";
    return NextResponse.json({ error }, { status: 401 });
  }

  await createPortalSession(result.customer.id);
  return NextResponse.json({ ok: true, next: `/portal/${result.customer.portalToken}` });
}
