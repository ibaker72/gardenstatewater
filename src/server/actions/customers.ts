'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { AccountType, CommChannel, CustomerStatus, SubscriptionPlan } from '@prisma/client';

/** Find the zone whose zip list contains this zip. */
export async function zoneForZip(zip: string | null | undefined) {
  if (!zip) return null;
  return prisma.zone.findFirst({ where: { zips: { has: zip.trim() } } });
}

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

function num(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function customerDataFromForm(form: FormData) {
  const zip = str(form, 'zip');
  let zoneId = str(form, 'zoneId');
  if (zoneId === 'auto' || !zoneId) {
    zoneId = (await zoneForZip(zip))?.id ?? null;
  }
  const birthday = str(form, 'birthday');
  return {
    name: str(form, 'name') ?? 'Unnamed customer',
    email: str(form, 'email'),
    phone: str(form, 'phone'),
    address: str(form, 'address') ?? '',
    city: str(form, 'city'),
    state: str(form, 'state') ?? 'NJ',
    zip,
    deliveryNotes: str(form, 'deliveryNotes'),
    accountType: (str(form, 'accountType') ?? 'RESIDENTIAL') as AccountType,
    plan: (str(form, 'plan') ?? 'ON_DEMAND') as SubscriptionPlan,
    planJugs: num(form, 'planJugs') ?? 2,
    preferredDay: num(form, 'preferredDay'),
    zoneId,
    jugsWithCustomer: num(form, 'jugsWithCustomer') ?? 0,
    birthday: birthday ? new Date(birthday) : null,
  };
}

export async function createCustomer(form: FormData) {
  const data = await customerDataFromForm(form);
  const customer = await prisma.customer.create({ data });
  revalidatePath('/customers');
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, form: FormData) {
  const data = await customerDataFromForm(form);
  await prisma.customer.update({ where: { id }, data });
  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function setCustomerStatus(id: string, status: CustomerStatus, note?: string) {
  await prisma.customer.update({
    where: { id },
    data: {
      status,
      suspendedAt: status === 'SUSPENDED' ? new Date() : null,
      suspensionNote: status === 'SUSPENDED' ? (note ?? null) : null,
    },
  });
  await prisma.commLog.create({
    data: {
      customerId: id,
      channel: 'NOTE',
      note: `Status changed to ${status}${note ? ` — ${note}` : ''}`,
    },
  });
  revalidatePath(`/customers/${id}`);
  revalidatePath('/customers');
}

export async function addCommLog(customerId: string, form: FormData) {
  const note = (form.get('note') as string | null)?.trim();
  const channel = ((form.get('channel') as string | null) ?? 'NOTE') as CommChannel;
  if (!note) return;
  await prisma.commLog.create({ data: { customerId, channel, note } });
  revalidatePath(`/customers/${customerId}`);
}

/** Adjust how many of our jugs sit at the customer's site (e.g. picked up empties outside an order). */
export async function adjustCustomerJugs(customerId: string, delta: number, reason: string) {
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: { jugsWithCustomer: { increment: delta } },
    });
    const jug = await tx.inventoryItem.findUnique({ where: { sku: 'JUG_5GAL' } });
    if (jug) {
      await tx.inventoryItem.update({
        where: { id: jug.id },
        data: { quantity: { increment: -delta } },
      });
      await tx.inventoryMovement.create({
        data: { itemId: jug.id, delta: -delta, reason, reference: customerId },
      });
    }
  });
  revalidatePath(`/customers/${customerId}`);
  revalidatePath('/inventory');
}
