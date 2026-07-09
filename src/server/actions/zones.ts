'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { runDailyAutomation } from '@/lib/notifications';

export async function upsertZone(form: FormData) {
  const id = (form.get('id') as string | null) || null;
  const data = {
    name: String(form.get('name') ?? '').trim(),
    description: (form.get('description') as string | null)?.trim() || null,
    deliveryFee: Number(form.get('deliveryFee')) || 0,
    zips: String(form.get('zips') ?? '')
      .split(/[,\s]+/)
      .map((z) => z.trim())
      .filter(Boolean),
  };
  if (!data.name) return;
  if (id) await prisma.zone.update({ where: { id }, data });
  else await prisma.zone.create({ data });
  revalidatePath('/settings');
  revalidatePath('/pricing');
}

export async function deleteZone(id: string) {
  await prisma.customer.updateMany({ where: { zoneId: id }, data: { zoneId: null } });
  await prisma.zone.delete({ where: { id } });
  revalidatePath('/settings');
}

/** Re-match every customer to a zone by zip (used after editing zone zip lists). */
export async function remapCustomerZones() {
  const zones = await prisma.zone.findMany();
  const customers = await prisma.customer.findMany({ where: { zip: { not: null } } });
  for (const c of customers) {
    const zone = zones.find((z) => z.zips.includes(c.zip!));
    if (zone && c.zoneId !== zone.id) {
      await prisma.customer.update({ where: { id: c.id }, data: { zoneId: zone.id } });
    }
  }
  revalidatePath('/settings');
  revalidatePath('/customers');
}

export async function runAutomationNow() {
  await runDailyAutomation();
  revalidatePath('/settings');
}
