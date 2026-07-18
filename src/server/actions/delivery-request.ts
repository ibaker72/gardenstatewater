'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getOwnerEmail } from '@/lib/env';
import { normalizePhone } from '@/lib/portal-auth';
import {
  deliveryRequestSchema,
  DISPENSER_LABELS,
  FREQUENCY_LABELS,
  QUANTITY_LABELS,
  type DeliveryRequestInput,
  type SubmitResult,
} from '@/lib/validation/delivery-request';
import { zoneForZip } from './customers';
import type { AccountType, Customer, SubscriptionPlan } from '@prisma/client';

const PLAN_MAP: Record<DeliveryRequestInput['frequency'], SubscriptionPlan> = {
  WEEKLY: 'WEEKLY',
  BIWEEKLY: 'BIWEEKLY',
  MONTHLY: 'MONTHLY',
  ONE_TIME: 'ON_DEMAND',
  NOT_SURE: 'ON_DEMAND',
};

const JUGS_MAP: Record<DeliveryRequestInput['quantity'], number> = {
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5_PLUS': 5,
  NOT_SURE: 2,
};

const STATUS_NOTE: Record<string, string> = {
  active: 'ZIP matched an active route',
  upcoming: 'ZIP is on an upcoming route',
  unavailable: 'ZIP is outside current routes (expansion list)',
  manual_review: 'availability needs manual review',
};

/**
 * Public delivery request from the landing page's multi-step flow.
 *
 * Reuses the existing onboarding pipeline: the requester becomes a PAUSED
 * customer (no deliveries until the owner confirms), a portal request lands
 * in the owner inbox, and the owner gets an email — identical review flow to
 * every other request. Nothing is charged or scheduled from here.
 */
export async function submitDeliveryRequest(input: DeliveryRequestInput): Promise<SubmitResult> {
  const parsed = deliveryRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      message:
        parsed.error.issues[0]?.message ??
        'Some details look incomplete — please review the form and try again.',
    };
  }
  const data = parsed.data;

  // Honeypot filled → pretend success so bots learn nothing.
  if (data.website) return { ok: true };

  const phoneRaw = data.contact.phone?.trim() || null;
  const email = data.contact.email?.trim() || null;
  const accountType: AccountType = data.customerType === 'business' ? 'COMMERCIAL' : 'RESIDENTIAL';

  const detailParts = [
    `Website delivery request (${data.customerType})`,
    `frequency: ${FREQUENCY_LABELS[data.frequency].toLowerCase()}`,
    `bottles: ${QUANTITY_LABELS[data.quantity].toLowerCase()}`,
    `dispenser: ${DISPENSER_LABELS[data.dispenser].toLowerCase()}`,
    data.serviceAreaStatus ? STATUS_NOTE[data.serviceAreaStatus] : null,
    data.contact.deliveryNotes ? `notes: "${data.contact.deliveryNotes}"` : null,
  ].filter(Boolean);
  const detail = detailParts.join(' — ');

  const address = data.contact.addressLine2
    ? `${data.contact.streetAddress}, ${data.contact.addressLine2}`
    : data.contact.streetAddress;

  try {
    // The same person requesting twice must not create a duplicate customer.
    const phone = normalizePhone(phoneRaw);
    let existing: Customer | null = email
      ? await prisma.customer.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
      : null;
    if (!existing && phone) {
      const withPhones = await prisma.customer.findMany({ where: { phone: { not: null } } });
      existing = withPhones.find((c) => normalizePhone(c.phone) === phone) ?? null;
    }

    const customer =
      existing ??
      (await prisma.customer.create({
        data: {
          name: data.contact.fullName,
          phone: phoneRaw,
          email,
          address,
          city: data.contact.city,
          zip: data.zip,
          accountType,
          plan: PLAN_MAP[data.frequency],
          planJugs: JUGS_MAP[data.quantity],
          deliveryNotes: data.contact.deliveryNotes?.trim() || null,
          status: 'PAUSED', // no deliveries until the owner confirms the request
          zoneId: (await zoneForZip(data.zip))?.id ?? null,
        },
      }));

    await prisma.portalRequest.create({
      data: { customerId: customer.id, kind: 'OTHER', detail },
    });

    const ownerEmail = getOwnerEmail();
    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: `New delivery request: ${data.contact.fullName}`,
        body: `${data.contact.fullName} requested delivery on gardenstatewater.com.\n\n${detail}\n\nAddress: ${address}, ${data.contact.city} ${data.zip}\nPhone: ${phoneRaw ?? '—'}\nEmail: ${email ?? '—'}${existing ? '\n\n(Matched an existing customer — check their profile.)' : ''}\n\nConfirm them from the Portal requests page, then activate their account and send a portal invite.`,
        type: 'PORTAL_REQUEST',
        customerId: customer.id,
      });
    }

    revalidatePath('/requests');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    console.error('[delivery-request] submission failed:', error);
    return {
      ok: false,
      error: 'server',
      message: 'We could not save your request just now. Please try again in a moment.',
    };
  }
}
