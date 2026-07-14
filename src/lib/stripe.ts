import Stripe from 'stripe';
import { cleanEnv, getAppUrl } from './env';
import { prisma } from './prisma';

// Server-only module: reads STRIPE_SECRET_KEY. Never import from client
// components — browser code gets no Stripe SDK (payments run through
// Stripe-hosted Checkout pages, so no publishable key is needed either).

function getStripeSecretKey(): string | undefined {
  return cleanEnv(process.env.STRIPE_SECRET_KEY);
}

export function stripeConfigured() {
  return Boolean(getStripeSecretKey());
}

let client: Stripe | null = null;

/**
 * Lazily-created Stripe server client, or null when STRIPE_SECRET_KEY isn't
 * set. Nothing is initialized at module import, so merely importing this
 * file (directly or transitively) can never crash an unrelated page.
 * Uses the SDK's pinned API version (this stripe v17 install → 2025-02-24.acacia).
 */
export function getStripe(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

/**
 * Create (or reuse) a Stripe Checkout session for the invoice's outstanding
 * balance and return its URL. Returns null when Stripe isn't configured.
 * Amount and currency are computed server-side from the invoice — nothing
 * about the price comes from the client.
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

  const appUrl = getAppUrl();
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

/**
 * "Pay All": one Checkout session covering every open invoice for the
 * customer, one line item per invoice. The webhook settles each invoice
 * individually (idempotently) from the metadata. Returns null when Stripe
 * isn't configured or nothing is due.
 */
export async function checkoutUrlForBalance(customerId: string): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const [customer, invoices] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
    prisma.invoice.findMany({
      where: { customerId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const entries = invoices
    .map((inv) => ({
      invoiceId: inv.id,
      number: inv.number,
      cents: Math.round((inv.total - inv.amountPaid) * 100),
    }))
    .filter((e) => e.cents > 0)
    // Stripe metadata values cap at 500 chars — a dozen invoices fits with
    // plenty of headroom, and nobody sane carries more open invoices anyway.
    .slice(0, 12);
  if (entries.length === 0) return null;

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customer.email ?? undefined,
    line_items: entries.map((e) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: `Garden State Water — Invoice #${e.number}` },
        unit_amount: e.cents,
      },
      quantity: 1,
    })),
    metadata: {
      kind: 'balance',
      customerId,
      invoices: JSON.stringify(entries.map((e) => [e.invoiceId, e.cents])),
    },
    success_url: `${appUrl}/portal/${customer.portalToken}/pay?paid=1`,
    cancel_url: `${appUrl}/portal/${customer.portalToken}/pay`,
  });

  return session.url;
}
