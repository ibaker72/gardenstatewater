import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { checkoutUrlForBalance } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/** "Pay All" entry point — authorized by the unguessable portal token. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const customer = await prisma.customer.findUnique({ where: { portalToken: token } });
  if (!customer || !customer.portalAccess) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = await checkoutUrlForBalance(customer.id).catch((e) => {
    console.error(
      `[pay] Balance checkout failed for customer ${customer.id}: ${e instanceof Error ? e.message : e}`
    );
    return null;
  });
  if (url) return NextResponse.redirect(url);

  // Stripe not configured or nothing due — back to their bill page.
  return NextResponse.redirect(`${getAppUrl()}/portal/${token}/pay`);
}
