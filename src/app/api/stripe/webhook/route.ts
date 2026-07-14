import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { cleanEnv } from '@/lib/env';
import { sendEmail } from '@/lib/email';
import { money } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { applyStripeBalancePayment, applyStripeCheckoutPayment } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook endpoint.
 *
 * Only `checkout.session.completed` does real work: this app sells one-time
 * invoice payments through Stripe-hosted Checkout — it creates no Stripe
 * subscriptions and no Stripe invoices, so subscription/invoice events can
 * never match an application record. Any other (validly signed) event is
 * acknowledged with 200 and logged, so Stripe doesn't retry it forever.
 * In the Stripe dashboard the endpoint only needs `checkout.session.completed`;
 * the customer.subscription.* / invoice.* events can be removed.
 */
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = cleanEnv(process.env.STRIPE_WEBHOOK_SECRET);
  if (!stripe || !secret) {
    console.error(
      '[stripe-webhook] Rejected delivery: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not configured on the server.'
    );
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // Verify the signature against the RAW body before trusting anything in it.
  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (e) {
    console.warn(
      `[stripe-webhook] Signature verification failed: ${e instanceof Error ? e.message : e}`
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const meta = session.metadata ?? {};
        if (session.payment_status !== 'paid') {
          console.log(
            `[stripe-webhook] ${event.type} ${event.id}: session ${session.id} payment_status=${session.payment_status}; ignoring.`
          );
          break;
        }

        if (meta.kind === 'balance' && meta.invoices) {
          // "Pay All" session: metadata carries [[invoiceId, cents], …].
          const entries = parseBalanceEntries(meta.invoices);
          if (!entries) {
            console.warn(
              `[stripe-webhook] ${event.type} ${event.id}: session ${session.id} has malformed balance metadata; ignoring.`
            );
            break;
          }
          const result = await applyStripeBalancePayment({ sessionId: session.id, entries });
          console.log(
            `[stripe-webhook] ${event.type} ${event.id}: balance session → applied ${result.applied}, duplicates ${result.duplicates}.`
          );
          if (result.applied > 0 && meta.customerId) {
            await sendPaymentReceipt(meta.customerId, session.amount_total ?? 0);
          }
          break;
        }

        const invoiceId = meta.invoiceId;
        if (!invoiceId) {
          // Not one of ours (or metadata was lost) — acknowledge, don't crash.
          console.warn(
            `[stripe-webhook] ${event.type} ${event.id}: session ${session.id} has no invoiceId metadata; ignoring.`
          );
          break;
        }
        const result = await applyStripeCheckoutPayment({
          sessionId: session.id,
          invoiceId,
          amountTotalCents: session.amount_total ?? 0,
        });
        console.log(
          `[stripe-webhook] ${event.type} ${event.id}: invoice ${invoiceId} → ${result}.`
        );
        if (result === 'applied') {
          const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            select: { customerId: true },
          });
          if (invoice) await sendPaymentReceipt(invoice.customerId, session.amount_total ?? 0);
        }
        break;
      }
      default:
        // Signed and valid, but nothing for this app to do.
        console.log(`[stripe-webhook] Ignoring unhandled event ${event.type} (${event.id}).`);
    }
  } catch (e) {
    // Real processing failure (e.g. database down) — non-2xx so Stripe retries.
    console.error(
      `[stripe-webhook] Failed processing ${event.type} (${event.id}): ${
        e instanceof Error ? e.message : e
      }`
    );
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Webhooks are POST-only; browsers poking the URL get an explicit 405. */
export function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

/** Parse "Pay All" metadata: a JSON array of [invoiceId, cents] pairs. */
function parseBalanceEntries(raw: string): { invoiceId: string; amountCents: number }[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const entries = parsed.map((pair) => {
      if (!Array.isArray(pair) || typeof pair[0] !== 'string' || typeof pair[1] !== 'number') {
        throw new Error('bad entry');
      }
      return { invoiceId: pair[0], amountCents: Math.round(pair[1]) };
    });
    return entries.every((e) => e.amountCents > 0) ? entries : null;
  } catch {
    return null;
  }
}

/** Emailed receipt after a successful online payment. Failures only log — never fail the webhook. */
async function sendPaymentReceipt(customerId: string, amountCents: number) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer?.email) return;
    await sendEmail({
      to: customer.email,
      subject: `Payment received — thank you! (${money(amountCents / 100)})`,
      body: `Hi ${customer.name.split(' ')[0]},

We received your online payment of ${money(amountCents / 100)}. Your balance is updated — you can see it any time in your portal.

Thanks for being a Garden State Water customer! 💧`,
      type: 'OTHER',
      customerId,
    });
  } catch (e) {
    console.error(
      `[stripe-webhook] Receipt email failed for customer ${customerId}: ${e instanceof Error ? e.message : e}`
    );
  }
}
