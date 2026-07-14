import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { applyStripeCheckoutPayment } from '../src/lib/payments';

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

function makeFakeDb(invoice: FakeInvoice, orders: FakeOrder[] = []) {
  const payments: FakePayment[] = [];
  const tx = {
    invoice: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        if (where.id !== invoice.id) throw new Error(`No invoice ${where.id}`);
        return { ...invoice };
      },
      update: async ({ data }: { where: { id: string }; data: Partial<FakeInvoice> }) => {
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
  return { db: db as unknown as PrismaClient, invoice, orders, payments };
}

describe('applyStripeCheckoutPayment', () => {
  let fake: ReturnType<typeof makeFakeDb>;

  beforeEach(() => {
    fake = makeFakeDb(
      { id: 'inv_1', customerId: 'cus_1', total: 50, amountPaid: 0, status: 'SENT' },
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
    assert.equal(fake.invoice.status, 'PAID');
    assert.equal(fake.invoice.amountPaid, 50);
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
    assert.equal(fake.invoice.amountPaid, 50, 'duplicate event must not double the amount paid');
  });

  it('marks a partial payment PARTIALLY_PAID and leaves orders alone', async () => {
    const result = await applyStripeCheckoutPayment(
      { sessionId: 'cs_test_2', invoiceId: 'inv_1', amountTotalCents: 2000 },
      fake.db
    );
    assert.equal(result, 'applied');
    assert.equal(fake.invoice.status, 'PARTIALLY_PAID');
    assert.equal(fake.invoice.amountPaid, 20);
    assert.equal(fake.orders[0].status, 'DELIVERED');
  });
});
