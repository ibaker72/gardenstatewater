import Stripe from 'stripe';
import { prisma } from './prisma';

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!stripeConfigured()) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

/**
 * Create (or reuse) a Stripe Checkout session for the invoice's outstanding
 * balance and return its URL. Returns null when Stripe isn't configured.
 */
export async function checkoutUrlForInvoice(invoiceId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { customer: true },
  });
  const due = Math.round((invoice.total - invoice.amountPaid) * 100);
  if (due <= 0) return null;

  if (invoice.stripeSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(invoice.stripeSessionId);
      if (existing.status === 'open' && existing.url) return existing.url;
    } catch {
      // stale session — create a fresh one below
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: invoice.customer.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `Garden State Water — Invoice #${invoice.number}` },
          unit_amount: due,
        },
        quantity: 1,
      },
    ],
    metadata: { invoiceId: invoice.id },
    success_url: `${appUrl}/portal/${invoice.customer.portalToken}?paid=1`,
    cancel_url: `${appUrl}/portal/${invoice.customer.portalToken}`,
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { stripeSessionId: session.id },
  });

  return session.url;
}
