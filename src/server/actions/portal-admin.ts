'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAppUrl } from '@/lib/env';
import { sendEmail, sendSms } from '@/lib/email';
import { notifyDeliveryConfirmed } from '@/lib/notify-customer';
import { getConfig, quoteOrder } from '@/lib/pricing';
import { hashPin } from '@/lib/portal-auth';
import { parseAccountChangeLines } from '@/lib/account-changes';

// Owner-side portal management. These actions are only reachable from admin
// pages, which sit behind the owner auth wall in the proxy.

function refreshRequestViews() {
  revalidatePath('/requests');
  revalidatePath('/');
}

/**
 * One-click approve. What "approve" means depends on the request kind:
 * EXTRA_DELIVERY → create the order (priced by the pricing engine) and text
 * the customer a confirmation; PAUSE/RESUME/CANCEL → flip the account
 * status; CONTACT_UPDATE → apply the requested field changes.
 */
export async function approvePortalRequest(id: string) {
  const request = await prisma.portalRequest.findUnique({
    where: { id },
    include: { customer: { include: { zone: true } } },
  });
  if (!request || request.resolved) return;
  const customer = request.customer;

  switch (request.kind) {
    case 'EXTRA_DELIVERY': {
      if (!request.requestedDate || !request.jugs) return; // free-text request — use "Create order"
      const config = await getConfig();
      const quote = quoteOrder(config, {
        refillJugs: request.jugs,
        plan: customer.plan,
        zoneDeliveryFee: customer.zone ? customer.zone.deliveryFee : null,
      });
      await prisma.order.create({
        data: {
          customerId: customer.id,
          deliveryDate: request.requestedDate,
          instructions: customer.deliveryNotes,
          subtotal: quote.subtotal,
          discount: quote.discount,
          deliveryFee: quote.deliveryFee,
          total: quote.total,
          items: {
            create: quote.lines.map((l) => ({
              productType: l.productType,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });
      await notifyDeliveryConfirmed(customer, request.requestedDate);
      revalidatePath('/orders');
      break;
    }
    case 'PAUSE': {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'PAUSED', suspensionNote: request.detail },
      });
      revalidatePath(`/customers/${customer.id}`);
      break;
    }
    case 'RESUME': {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'ACTIVE', suspensionNote: null },
      });
      revalidatePath(`/customers/${customer.id}`);
      break;
    }
    case 'CONTACT_UPDATE': {
      const changes = parseAccountChangeLines(request.detail ?? '');
      const data: Record<string, string | null> = {};
      for (const [field, value] of Object.entries(changes)) {
        // name/address are required fields — never blank them from a request.
        if ((field === 'name' || field === 'address') && !value) continue;
        data[field] = value;
      }
      if (Object.keys(data).length > 0) {
        await prisma.customer.update({ where: { id: customer.id }, data });
      }
      revalidatePath(`/customers/${customer.id}`);
      revalidatePath('/customers');
      break;
    }
    case 'CANCEL': {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'CHURNED' },
      });
      revalidatePath(`/customers/${customer.id}`);
      revalidatePath('/customers');
      break;
    }
    default:
      break; // unknown kinds just get resolved
  }

  await prisma.$transaction([
    prisma.portalRequest.update({ where: { id }, data: { resolved: true } }),
    prisma.commLog.create({
      data: { customerId: customer.id, channel: 'NOTE', note: `Approved portal request: ${request.detail ?? request.kind}` },
    }),
  ]);
  refreshRequestViews();
}

/** Decline: resolve + leave a paper trail. The owner contacts them directly. */
export async function declinePortalRequest(id: string) {
  const request = await prisma.portalRequest.findUnique({ where: { id } });
  if (!request || request.resolved) return;
  await prisma.$transaction([
    prisma.portalRequest.update({ where: { id }, data: { resolved: true } }),
    prisma.commLog.create({
      data: { customerId: request.customerId, channel: 'NOTE', note: `Declined portal request: ${request.detail ?? request.kind}` },
    }),
  ]);
  refreshRequestViews();
}

/** Text (or email) the customer their sign-in link. */
export async function sendPortalInvite(customerId: string) {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const link = `${getAppUrl()}/portal?token=${customer.portalToken}`;
  const body = `Hi ${customer.name.split(' ')[0]}! Manage your Garden State Water deliveries, see your bill, and pay online here: ${link}`;
  if (customer.phone) {
    await sendSms({ to: customer.phone, body, type: 'OTHER', customerId, fallbackEmail: customer.email });
  } else if (customer.email) {
    await sendEmail({ to: customer.email, subject: 'Your Garden State Water customer portal', body, type: 'OTHER', customerId });
  }
  revalidatePath(`/customers/${customerId}`);
}

export async function setPortalAccess(customerId: string, on: boolean) {
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id: customerId }, data: { portalAccess: on } });
    // Switching access off kills any live sessions immediately.
    if (!on) await tx.portalSession.deleteMany({ where: { customerId } });
  });
  revalidatePath(`/customers/${customerId}`);
}

/** Set (or clear) the customer's 4-digit PIN fallback login. */
export async function setPortalPin(customerId: string, form: FormData) {
  const pin = String(form.get('pin') ?? '').trim();
  if (pin === '') {
    await prisma.customer.update({ where: { id: customerId }, data: { portalPin: null } });
  } else {
    if (!/^\d{4}$/.test(pin)) return;
    await prisma.customer.update({
      where: { id: customerId },
      data: { portalPin: hashPin(customerId, pin) },
    });
  }
  revalidatePath(`/customers/${customerId}`);
}