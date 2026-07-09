import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkoutUrlForInvoice } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/** Public payment entry point used in invoice emails and the customer portal. */
export async function GET(_req: NextRequest, { params }: { params: { invoiceId: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { customer: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const url = await checkoutUrlForInvoice(invoice.id);
  if (url) return NextResponse.redirect(url);

  // Stripe not configured or nothing due — send them to their portal instead.
  return NextResponse.redirect(`${appUrl}/portal/${invoice.customer.portalToken}`);
}
