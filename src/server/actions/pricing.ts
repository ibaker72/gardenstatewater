'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { DEFAULT_CONFIG_ID } from '@/lib/pricing';

const NUMERIC_FIELDS = [
  'jugRefillPrice',
  'jugPurchasePrice',
  'dispenserRentalPrice',
  'bottleCasePrice',
  'flatDeliveryFee',
  'weeklyDiscountPct',
  'biweeklyDiscountPct',
  'monthlyDiscountPct',
  'bulkBuyQty',
  'bulkFreeQty',
  'costPerGallon',
  'gasCostPerMile',
  'laborCostPerHour',
  'targetMarginPct',
  'lowStockThreshold',
  'overdueSuspendDays',
  'loyaltyMonths',
] as const;

const INT_FIELDS = new Set(['bulkBuyQty', 'bulkFreeQty', 'lowStockThreshold', 'overdueSuspendDays', 'loyaltyMonths']);

export async function updateConfig(form: FormData) {
  const data: Record<string, number | boolean> = {};
  for (const field of NUMERIC_FIELDS) {
    const raw = form.get(field);
    if (raw === null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    data[field] = INT_FIELDS.has(field) ? Math.round(n) : n;
  }
  for (const flag of ['loyaltyEnabled', 'autoSuspendEnabled']) {
    if (form.has(`${flag}__present`)) data[flag] = form.get(flag) === 'on';
  }
  const business: Record<string, string | null> = {};
  if (form.has('businessName')) {
    business.businessName = String(form.get('businessName')).trim() || 'Garden State Water';
    for (const field of ['businessPhone', 'businessEmail', 'businessAddress']) {
      business[field] = (form.get(field) as string | null)?.trim() || null;
    }
  }
  await prisma.pricingConfig.upsert({
    where: { id: DEFAULT_CONFIG_ID },
    update: { ...data, ...business },
    create: { id: DEFAULT_CONFIG_ID, ...data, ...business },
  });
  revalidatePath('/pricing');
  revalidatePath('/settings');
  revalidatePath('/invoices');
}

export async function upsertCompetitor(form: FormData) {
  const id = (form.get('id') as string | null) || null;
  const parse = (k: string) => {
    const v = form.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const data = {
    competitor: String(form.get('competitor') ?? 'Competitor').trim(),
    jugRefill: parse('jugRefill'),
    jugPurchase: parse('jugPurchase'),
    dispenserRent: parse('dispenserRent'),
    bottleCase: parse('bottleCase'),
    deliveryFee: parse('deliveryFee'),
    notes: (form.get('notes') as string | null)?.trim() || null,
  };
  if (id) await prisma.competitorPrice.update({ where: { id }, data });
  else await prisma.competitorPrice.create({ data });
  revalidatePath('/pricing');
}

export async function deleteCompetitor(id: string) {
  await prisma.competitorPrice.delete({ where: { id } });
  revalidatePath('/pricing');
}
