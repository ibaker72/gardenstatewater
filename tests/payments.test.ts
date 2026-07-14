import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { applyStripeBalancePayment, applyStripeCheckoutPayment } from '../src/lib/payments';

/**
 * Minimal in-memory stand-in for the Prisma transaction client, covering
 * exactly the surface the payment logic touches.
 */
interface FakeInvoice {
  id: string;
  customerId: string;
  total: number;
  amountPaid: number;
  status: string;
}
interface FakePayment {
  id: string;
  customerId: string;
  invoiceId: string;
  method: string;
  amount: number;
  reference: string | null;
}
interface FakeOrder {
  id: string;
  invoiceId: string | null;
  status: string;
  paymentMethod: string | null;
}

function makeFakeDb(invoices: FakeInvoice[], orders: FakeOrder[] = []) {
  const payments: FakePayment[] = [];
  const tx = {
    invoice: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const invoice = invoices.find((i) => i.id === where.id);
        if (!invoice) throw new Error(`No invoice ${where.id}`);
        return { ...invoice };
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeInvoice> }) => {
        const invoice = invoices.find((i) => i.id === where.id)!;
        Object.assign(invoice, data);
        return { ...invoice };
      },
    },
    payment: {
      findFirst: async ({
        where,
      }: {
        where: { method: string; reference: string };
        select?: unknown;
      }) => {
        return (
          payments.find((p) => p.method === where.method && p.reference === where.reference) ??
          null
        );
      },
      create: async ({ data }: { data: Omit<FakePayment, 'id'> }) => {
        const payment = { id: `pay_${payments.length + 1}`, ...data };
        payments.push(payment);
        return payment;
      },
    },
    order: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { invoiceId: string; status: string };
        data: Partial<FakeOrder>;
      }) => {
        let count = 0;
        for (const order of orders) {
          if (order.invoiceId === where.invoiceId && order.status === where.status) {
            Object.assign(order, data);
            count++;
          }
        }
        return { count };
      },
    },
  };
  const db = {
    $transaction: async <T>(fn: (t: typeof tx) => Promise<T>): Promise<T> => fn(tx),
  };
  return { db: db as unknown as PrismaClient, invoices, orders, payments };
}

describe('applyStripeCheckoutPayment', () => {
  let fake: ReturnType<typeof makeFakeDb>;

  beforeEach(() => {
    fake = makeFakeDb(
      [{ id: 'inv_1', customerId: 'cus_1', total: 50, amountPaid: 0, status: 'SENT' }],
      [{ id: 'ord_1', invoiceId: 'inv_1', status: 'DELIVERED', paymentMethod: null }]
    );
  });

  it('applies a full payment: records it, marks invoice and orders PAID', async () => {
    const result = await applyStripeCheckoutPayment(
      { sessionId: 'cs_test_1', invoiceId: 'inv_1', amountTotalCents: 5000 },
      fake.db
    );
    assert.equal(result, 'applied');
    assert.equal(fake.payments.length, 1);
    assert.equal(fake.payments[0].amount, 50);
    assert.equal(fake.payments[0].reference, 'cs_test_1');
    assert.equal(fake.invoices[0].status, 'PAID');
    assert.equal(fake.invoices[0].amountPaid, 50);
    assert.equal(fake.orders[0].status, 'PAID');
  });

  it('is idempotent: a duplicate delivery of the same session is a no-op', async () => {
    const first = await applyStripeCheckoutPayment(
      { sessionId: 'cs_test_1', invoiceId: 'inv_1', amountTotalCents: 5000 },
      fake.db
    );
    const second = await applyStripeCheckoutPayment(
      { sessionId: 'cs_test_1', invoiceId: 'inv_1', amountTotalCents: 5000 },
      fake.db
    );
    assert.equal(first, 'applied');
    assert.equal(second, 'duplicate');
    assert.equal(fake.payments.length, 1, 'duplicate event must not create a second payment');
    assert.equal(fake.invoices[0].amountPaid, 50, 'duplicate event must not double the amount paid');
  });

  it('marks a partial payment PARTIALLY_PAID and leaves orders alone', async () => {
    const result = await applyStripeCheckoutPayment(
      { sessionId: 'cs_test_2', invoiceId: 'inv_1', amountTotalCents: 2000 },
      fake.db
    );
    assert.equal(result, 'applied');
    assert.equal(fake.invoices[0].status, 'PARTIALLY_PAID');
    assert.equal(fake.invoices[0].amountPaid, 20);
    assert.equal(fake.orders[0].status, 'DELIVERED');
  });
});

describe('applyStripeBalancePayment (Pay All)', () => {
  let fake: ReturnType<typeof makeFakeDb>;

  beforeEach(() => {
    fake = makeFakeDb([
      { id: 'inv_a', customerId: 'cus_1', total: 45.2, amountPaid: 0, status: 'OVERDUE' },
      { id: 'inv_b', customerId: 'cus_1', total: 32, amountPaid: 0, status: 'SENT' },
    ]);
  });

  it('settles every invoice in the session with one payment each', async () => {
    const result = await applyStripeBalancePayment(
      {
        sessionId: 'cs_all_1',
        entries: [
          { invoiceId: 'inv_a', amountCents: 4520 },
          { invoiceId: 'inv_b', amountCents: 3200 },
        ],
      },
      fake.db
    );
    assert.deepEqual(result, { applied: 2, duplicates: 0 });
    assert.equal(fake.payments.length, 2);
    assert.deepEqual(
      fake.payments.map((p) => p.reference).sort(),
      ['cs_all_1:inv_a', 'cs_all_1:inv_b']
    );
    assert.equal(fake.invoices[0].status, 'PAID');
    assert.equal(fake.invoices[1].status, 'PAID');
  });

  it('a redelivered webhook skips already-recorded invoices', async () => {
    const entries = [
      { invoiceId: 'inv_a', amountCents: 4520 },
      { invoiceId: 'inv_b', amountCents: 3200 },
    ];
    await applyStripeBalancePayment({ sessionId: 'cs_all_1', entries }, fake.db);
    const second = await applyStripeBalancePayment({ sessionId: 'cs_all_1', entries }, fake.db);
    assert.deepEqual(second, { applied: 0, duplicates: 2 });
    assert.equal(fake.payments.length, 2, 'no invoice may be paid twice');
    assert.equal(fake.invoices[0].amountPaid, 45.2);
    assert.equal(fake.invoices[1].amountPaid, 32);
  });
});
