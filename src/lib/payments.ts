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
