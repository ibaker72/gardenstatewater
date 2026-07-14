'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { shortDate, upcomingDeliveryDates, WEEKDAYS } from '@/lib/format';

/** All portal actions authorize by the unguessable portal token, never by id. */
async function customerByToken(token: string) {
  return prisma.customer.findUnique({ where: { portalToken: token } });
}

async function notifyOwner(subject: string, body: string, customerId: string) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return;
  await sendEmail({ to: ownerEmail, subject, body, type: 'PORTAL_REQUEST', customerId });
}

export async function requestExtraDelivery(token: string, form: FormData) {
  const customer = await customerByToken(token);
  if (!customer) return;
  const detail = (form.get('detail') as string | null)?.trim() || 'Extra delivery requested';
  await prisma.portalRequest.create({
    data: { customerId: customer.id, kind: 'EXTRA_DELIVERY', detail },
  });
  await notifyOwner(
    `💧 ${customer.name} requested an extra delivery`,
    `${customer.name} (${customer.address}) says:\n\n"${detail}"\n\nCreate the order from their profile.`,
    customer.id
  );
  revalidatePath(`/portal/${token}`);
}

export async function requestPauseOrResume(token: string, form: FormData) {
  const customer = await customerByToken(token);
  if (!customer) return;
  const kind = form.get('kind') === 'RESUME' ? 'RESUME' : 'PAUSE';
  await prisma.portalRequest.create({
    data: { customerId: customer.id, kind, detail: (form.get('detail') as string | null)?.trim() || null },
  });
  // Pausing is safe to apply immediately; resuming waits for the owner.
  if (kind === 'PAUSE' && customer.status === 'ACTIVE') {
    await prisma.customer.update({ where: { id: customer.id }, data: { status: 'PAUSED' } });
  }
  await notifyOwner(
    `${kind === 'PAUSE' ? '⏸️' : '▶️'} ${customer.name} asked to ${kind.toLowerCase()} service`,
    `${customer.name} (${customer.address}) requested to ${kind.toLowerCase()} their delivery service.`,
    customer.id
  );
  revalidatePath(`/portal/${token}`);
}

/**
 * Structured delivery request from the portal form: jug count + a date the
 * customer's zone is actually served. Lands in the owner's request inbox
 * for approval — it never creates an order directly.
 */
export async function requestDeliveryOrder(token: string, form: FormData) {
  const customer = await prisma.customer.findUnique({
    where: { portalToken: token },
    include: { zone: true },
  });
  if (!customer || !customer.portalAccess) return;

  const jugs = Math.min(10, Math.max(1, Math.round(Number(form.get('jugs')) || 0)));
  const notes = (form.get('notes') as string | null)?.trim() || null;

  // Only accept a date the zone is actually served (and in the future) —
  // the form offers exactly these, but never trust the submitted value.
  const allowed = upcomingDeliveryDates(customer.zone?.deliveryDays ?? []);
  const requestedDate = allowed.find(
    (d) => d.toISOString().slice(0, 10) === String(form.get('date'))
  );
  if (!requestedDate) return;

  const detail = `${jugs} jug${jugs === 1 ? '' : 's'} on ${WEEKDAYS[requestedDate.getDay()]} ${shortDate(requestedDate)}${notes ? ` — "${notes}"` : ''}`;
  await prisma.portalRequest.create({
    data: { customerId: customer.id, kind: 'EXTRA_DELIVERY', detail, jugs, requestedDate },
  });
  await notifyOwner(
    `💧 ${customer.name} requested a delivery`,
    `${customer.name} (${customer.address}) requested:\n\n${detail}\n\nApprove it from the Portal requests page or create the order from their profile.`,
    customer.id
  );
  revalidatePath(`/portal/${token}`);
  redirect(`/portal/${token}/request?sent=1&jugs=${jugs}&date=${requestedDate.toISOString().slice(0, 10)}`);
}

export async function updateContactInfo(token: string, form: FormData) {
  const customer = await customerByToken(token);
  if (!customer) return;
  const phone = (form.get('phone') as string | null)?.trim() || null;
  const email = (form.get('email') as string | null)?.trim() || null;
  await prisma.customer.update({ where: { id: customer.id }, data: { phone, email } });
  await prisma.portalRequest.create({
    data: {
      customerId: customer.id,
      kind: 'CONTACT_UPDATE',
      detail: `Updated contact info to phone=${phone ?? '—'} email=${email ?? '—'}`,
      resolved: true,
    },
  });
  revalidatePath(`/portal/${token}`);
}

export async function resolvePortalRequest(id: string) {
  await prisma.portalRequest.update({ where: { id }, data: { resolved: true } });
  revalidatePath('/requests');
  revalidatePath('/');
}
