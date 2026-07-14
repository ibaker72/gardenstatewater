import type { PaymentMethod, PrismaClient } from '@prisma/client';
import { prisma } from './prisma';
import { round2 } from './pricing-core';

/** The subset of the transaction client the payment logic needs. */
type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

async function applyPaymentInTx(
  tx: Tx,
  invoiceId: string,
  amount: number,
  method: PaymentMethod,
  reference: string | null
) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  await tx.payment.create({
    data: { customerId: invoice.customerId, invoiceId, method, amount, reference },
  });
  const amountPaid = round2(invoice.amountPaid + amount);
  const paidInFull = amountPaid >= invoice.total - 0.005;
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid, status: paidInFull ? 'PAID' : 'PARTIALLY_PAID' },
  });
  if (paidInFull) {
    await tx.order.updateMany({
      where: { invoiceId, status: 'DELIVERED' },
      data: { status: 'PAID', paymentMethod: method },
    });
  }
}

/** Record a payment against an invoice and roll up invoice/order status. */
export async function applyInvoicePayment(
  invoiceId: string,
  amount: number,
  method: PaymentMethod,
  reference: string | null,
  db: PrismaClient = prisma
) {
  await db.$transaction((tx) => applyPaymentInTx(tx, invoiceId, amount, method, reference));
}

export type StripeCheckoutPaymentResult = 'applied' | 'duplicate';

/**
 * Idempotently apply a multi-invoice ("pay all") Stripe Checkout session.
 * Each invoice gets its own payment row referenced `<sessionId>:<invoiceId>`,
 * so redelivered webhooks skip exactly the invoices already recorded.
 */
export async function applyStripeBalancePayment(
  input: { sessionId: string; entries: { invoiceId: string; amountCents: number }[] },
  db: PrismaClient = prisma
): Promise<{ applied: number; duplicates: number }> {
  let applied = 0;
  let duplicates = 0;
  for (const entry of input.entries) {
    const reference = `${input.sessionId}:${entry.invoiceId}`;
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.payment.findFirst({
        where: { method: 'STRIPE', reference },
        select: { id: true },
      });
      if (existing) return 'duplicate' as const;
      await applyPaymentInTx(
        tx,
        entry.invoiceId,
        round2(entry.amountCents / 100),
        'STRIPE',
        reference
      );
      return 'applied' as const;
    });
    if (result === 'applied') applied++;
    else duplicates++;
  }
  return { applied, duplicates };
}

/**
 * Idempotently record a completed Stripe Checkout session against an invoice.
 * Stripe retries webhook deliveries and can send the same event more than
 * once — the session id is used as the payment reference, and a second
 * delivery for the same session is a no-op.
 */
export async function applyStripeCheckoutPayment(
  input: { sessionId: string; invoiceId: string; amountTotalCents: number },
  db: PrismaClient = prisma
): Promise<StripeCheckoutPaymentResult> {
  return db.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({
      where: { method: 'STRIPE', reference: input.sessionId },
      select: { id: true },
    });
    if (existing) return 'duplicate';
    await applyPaymentInTx(
      tx,
      input.invoiceId,
      round2(input.amountTotalCents / 100),
      'STRIPE',
      input.sessionId
    );
    return 'applied';
  });
}
