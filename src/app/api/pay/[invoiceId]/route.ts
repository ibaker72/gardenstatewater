import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { checkoutUrlForInvoice } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/** Public payment entry point used in invoice emails and the customer portal. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const appUrl = getAppUrl();
  const url = await checkoutUrlForInvoice(invoice.id).catch((e) => {
    console.error(
      `[pay] Stripe checkout failed for invoice ${invoice.id}: ${e instanceof Error ? e.message : e}`
    );
    return null;
  });
  if (url) return NextResponse.redirect(url);

  // Stripe not configured or nothing due — send them to their portal instead.
  return NextResponse.redirect(`${appUrl}/portal/${invoice.customer.portalToken}`);
}
