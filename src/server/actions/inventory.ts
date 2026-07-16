'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function upsertInventoryItem(form: FormData) {
  const id = (form.get('id') as string | null) || null;
  const data = {
    sku: String(form.get('sku') ?? '').trim().toUpperCase().replace(/\s+/g, '_'),
    name: String(form.get('name') ?? '').trim(),
    category: String(form.get('category') ?? 'consumable'),
    unit: String(form.get('unit') ?? 'unit').trim() || 'unit',
    unitCost: Number(form.get('unitCost')) || 0,
    reorderThreshold: Math.round(Number(form.get('reorderThreshold')) || 0),
    reorderAmount: Math.round(Number(form.get('reorderAmount')) || 0),
  };
  if (!data.sku || !data.name) return;
  if (id) {
    await prisma.inventoryItem.update({ where: { id }, data });
  } else {
    await prisma.inventoryItem.create({
      data: { ...data, quantity: Math.round(Number(form.get('quantity')) || 0) },
    });
  }
  revalidatePath('/inventory');
}

/** Manual stock adjustment with an audit movement. */
export async function adjustStock(form: FormData) {
  const itemId = String(form.get('itemId'));
  const delta = Math.round(Number(form.get('delta')));
  const reason = String(form.get('reason') ?? 'adjustment');
  if (!delta) return;
  await prisma.$transaction([
    prisma.inventoryItem.update({ where: { id: itemId }, data: { quantity: { increment: delta } } }),
    prisma.inventoryMovement.create({ data: { itemId, delta, reason } }),
  ]);
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
}

export async function upsertSupplier(form: FormData) {
  const data = {
    name: String(form.get('name') ?? '').trim(),
    contact: (form.get('contact') as string | null)?.trim() || null,
    phone: (form.get('phone') as string | null)?.trim() || null,
    email: (form.get('email') as string | null)?.trim() || null,
    address: (form.get('address') as string | null)?.trim() || null,
    notes: (form.get('notes') as string | null)?.trim() || null,
  };
  if (!data.name) return;
  await prisma.supplier.create({ data });
  revalidatePath('/inventory');
}

/** Log a water purchase run: records cost history and tops up jug stock if refilled. */
export async function logSupplierPurchase(form: FormData) {
  const supplierId = String(form.get('supplierId'));
  const gallons = Number(form.get('gallons')) || 0;
  const costPerGallon = Number(form.get('costPerGallon')) || 0;
  const otherCost = Number(form.get('otherCost')) || 0;
  const jugsFilled = Math.round(Number(form.get('jugsFilled')) || 0);
  const notes = (form.get('notes') as string | null)?.trim() || null;
  const total = Math.round((gallons * costPerGallon + otherCost) * 100) / 100;

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.supplierPurchase.create({
      data: { supplierId, gallons, costPerGallon, otherCost, total, notes },
    });
    if (jugsFilled > 0) {
      const jug = await tx.inventoryItem.findUnique({ where: { sku: 'JUG_5GAL' } });
      if (jug) {
        await tx.inventoryItem.update({
          where: { id: jug.id },
          data: { quantity: { increment: jugsFilled } },
        });
        await tx.inventoryMovement.create({
          data: { itemId: jug.id, delta: jugsFilled, reason: 'purchase', reference: purchase.id },
        });
      }
    }
    // Keep the pricing engine's cost-per-gallon in sync with the latest buy.
    if (costPerGallon > 0) {
      await tx.pricingConfig.upsert({
        where: { id: 'default' },
        update: { costPerGallon },
        create: { id: 'default', costPerGallon },
      });
    }
  });

  revalidatePath('/inventory');
  revalidatePath('/pricing');
}
