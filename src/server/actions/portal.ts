'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

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
