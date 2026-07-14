import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { cleanEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { applyStripeCheckoutPayment } from '@/lib/payments';

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
        const invoiceId = session.metadata?.invoiceId;
        if (!invoiceId) {
          // Not one of ours (or metadata was lost) — acknowledge, don't crash.
          console.warn(
            `[stripe-webhook] ${event.type} ${event.id}: session ${session.id} has no invoiceId metadata; ignoring.`
          );
          break;
        }
        if (session.payment_status !== 'paid') {
          console.log(
            `[stripe-webhook] ${event.type} ${event.id}: session ${session.id} payment_status=${session.payment_status}; ignoring.`
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
