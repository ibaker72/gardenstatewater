'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { round2 } from '@/lib/pricing-core';
import { sendEmail } from '@/lib/email';
import { checkoutUrlForInvoice, stripeConfigured } from '@/lib/stripe';
import { money, shortDate } from '@/lib/format';
import type { PaymentMethod } from '@prisma/client';

/** Bundle a customer's uninvoiced, delivered-but-unpaid orders into an invoice. */
export async function createInvoice(form: FormData) {
  const customerId = String(form.get('customerId'));
  const dueDate = new Date(String(form.get('dueDate')) + 'T00:00:00');
  const memo = (form.get('memo') as string | null)?.trim() || null;

  const orders = await prisma.order.findMany({
    where: { customerId, invoiceId: null, status: 'DELIVERED' },
  });
  if (orders.length === 0) redirect(`/invoices/new?customer=${customerId}&error=noorders`);

  const subtotal = round2(orders.reduce((s, o) => s + o.subtotal, 0));
  const discount = round2(orders.reduce((s, o) => s + o.discount, 0));
  const deliveryFees = round2(orders.reduce((s, o) => s + o.deliveryFee, 0));
  const total = round2(subtotal - discount + deliveryFees);

  const invoice = await prisma.invoice.create({
    data: {
      customerId,
      dueDate,
      memo,
      subtotal,
      discount,
      deliveryFees,
      total,
      orders: { connect: orders.map((o) => ({ id: o.id })) },
    },
  });

  revalidatePath('/invoices');
  redirect(`/invoices/${invoice.id}`);
}

/** Email the invoice to the customer (with a Stripe link when configured). */
export async function sendInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { customer: true, orders: { include: { items: true } } },
  });
  if (!invoice.customer.email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const payUrl = stripeConfigured()
    ? `${appUrl}/api/pay/${invoice.id}`
    : `${appUrl}/portal/${invoice.customer.portalToken}`;

  const lines = invoice.orders
    .map(
      (o) =>
        `${shortDate(o.deliveryDate)} — ${o.items.map((i) => i.description ?? i.productType).join(', ')} — ${money(o.total)}`
    )
    .join('\n');

  await sendEmail({
    to: invoice.customer.email,
    subject: `Invoice #${invoice.number} from Garden State Water — ${money(invoice.total)}`,
    body: `Hi ${invoice.customer.name},

Here's your invoice for recent deliveries:

${lines}

Total due: ${money(invoice.total - invoice.amountPaid)}
Due date: ${shortDate(invoice.dueDate)}
${invoice.memo ? `\nNote: ${invoice.memo}` : ''}
${stripeConfigured() ? `Pay online: ${payUrl}` : `View your account: ${payUrl}`}

Thanks for your business!`,
    type: 'INVOICE',
    customerId: invoice.customerId,
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status, sentAt: new Date() },
  });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/invoices');
}

/** Record a manual payment (cash / Venmo / CashApp / check) against an invoice. */
export async function logInvoicePayment(invoiceId: string, form: FormData) {
  const amount = Number(form.get('amount'));
  const method = String(form.get('method')) as PaymentMethod;
  const reference = (form.get('reference') as string | null)?.trim() || null;
  if (!Number.isFinite(amount) || amount <= 0) return;

  await applyInvoicePayment(invoiceId, amount, method, reference);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/invoices');
  revalidatePath('/');
}

/** Shared by manual logging and the Stripe webhook. */
export async function applyInvoicePayment(
  invoiceId: string,
  amount: number,
  method: PaymentMethod,
  reference: string | null
) {
  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { orders: true },
    });
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
  });
}

export async function voidInvoice(invoiceId: string) {
  await prisma.$transaction([
    prisma.order.updateMany({ where: { invoiceId }, data: { invoiceId: null } }),
    prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'VOID' } }),
  ]);
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function sendPaymentReminder(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { customer: true },
  });
  if (!invoice.customer.email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - invoice.dueDate.getTime()) / 86_400_000)
  );
  const due = round2(invoice.total - invoice.amountPaid);

  await sendEmail({
    to: invoice.customer.email,
    subject: `Friendly reminder — invoice #${invoice.number} (${money(due)})`,
    body: `Hi ${invoice.customer.name},

Just a friendly reminder that invoice #${invoice.number} for ${money(due)} was due ${
      daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago` : `on ${shortDate(invoice.dueDate)}`
    }.

${stripeConfigured() ? `Pay online: ${appUrl}/api/pay/${invoice.id}` : `You can pay by cash, Venmo, or CashApp on your next delivery.`}

Thanks so much!`,
    type: 'PAYMENT_REMINDER',
    customerId: invoice.customerId,
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

/** Refresh the Stripe checkout link (used by the owner UI to copy/share it). */
export async function getPaymentLink(invoiceId: string): Promise<string | null> {
  return checkoutUrlForInvoice(invoiceId);
}
