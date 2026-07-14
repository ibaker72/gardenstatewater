// Placeholder credentials for local signature math only — never real keys.
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_local_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder_local_only';
process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
process.env.DIRECT_URL = process.env.DATABASE_URL;

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/stripe/webhook/route';
import { getStripe, stripeConfigured } from '../src/lib/stripe';

const WEBHOOK_URL = 'http://localhost:3000/api/stripe/webhook';
const secret = process.env.STRIPE_WEBHOOK_SECRET!;
const signer = new Stripe(process.env.STRIPE_SECRET_KEY!);

function postRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest(WEBHOOK_URL, { method: 'POST', body, headers });
}

function signedRequest(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const signature = signer.webhooks.generateTestHeaderString({ payload, secret });
  return postRequest(payload, { 'stripe-signature': signature });
}

describe('stripe client helper', () => {
  it('reports configured and returns a client with the placeholder key set', () => {
    assert.equal(stripeConfigured(), true);
    assert.ok(getStripe());
  });
});

describe('GET /api/stripe/webhook', () => {
  it('is not a valid Stripe delivery: 405 with Allow: POST', async () => {
    const res = GET();
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
  });
});

describe('POST /api/stripe/webhook', () => {
  it('rejects a missing signature with 400', async () => {
    const res = await POST(postRequest(JSON.stringify({ hello: 'world' })));
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /signature/i);
  });

  it('rejects an invalid signature with 400 and does not leak details', async () => {
    const res = await POST(
      postRequest(JSON.stringify({ id: 'evt_bad' }), {
        'stripe-signature': 't=123,v1=deadbeef',
      })
    );
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Invalid signature');
  });

  it('acknowledges a correctly signed event of an unhandled type with 200', async () => {
    const res = await POST(
      signedRequest({
        id: 'evt_test_unhandled',
        object: 'event',
        type: 'invoice.paid',
        data: { object: { id: 'in_test_1' } },
      })
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
  });

  it('acknowledges checkout.session.completed with missing metadata instead of crashing', async () => {
    const res = await POST(
      signedRequest({
        id: 'evt_test_no_metadata',
        object: 'event',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_no_meta', payment_status: 'paid', metadata: {} } },
      })
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { received: true });
  });

  it('acknowledges an unpaid checkout session without touching the database', async () => {
    const res = await POST(
      signedRequest({
        id: 'evt_test_unpaid',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_unpaid',
            payment_status: 'unpaid',
            metadata: { invoiceId: 'inv_1' },
          },
        },
      })
    );
    assert.equal(res.status, 200);
  });
});
