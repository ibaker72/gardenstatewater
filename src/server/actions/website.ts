'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { townSlug } from '@/config/launch-service-area';
import { normalizeZip } from '@/lib/service-area';

// Owner-managed website content: serviceable ZIPs, deals/banner, public
// plans, and the waitlist — all behind the admin auth wall.

/** Every path that renders from this data. */
function revalidateSite() {
  revalidatePath('/');
  revalidatePath('/signup');
  // 'layout' sweeps the whole tree: the index AND every /water-delivery/[slug]
  // town page (they're ISR-cached, so edits must bust them all).
  revalidatePath('/water-delivery', 'layout');
  revalidatePath('/settings/website');
}

const str = (form: FormData, key: string): string | null => {
  const v = form.get(key);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
};

// ── Serviceable ZIPs ────────────────────────────────────────────────────────

export async function addServiceZips(form: FormData) {
  const town = str(form, 'town');
  const state = (str(form, 'state') ?? 'NJ').toUpperCase();
  const region = str(form, 'region');
  const zoneId = str(form, 'zoneId');
  const zipsRaw = str(form, 'zips') ?? '';
  const zips = [...new Set(zipsRaw.split(/[,\s]+/).map((z) => normalizeZip(z)).filter((z): z is string => z !== null))];
  if (!town || !region || zips.length === 0) return;

  const slug = townSlug(town, state);
  for (const zip of zips) {
    await prisma.serviceZip.upsert({
      where: { zip },
      update: { town, state, region, slug, zoneId, active: true },
      create: { zip, town, state, region, slug, zoneId },
    });
  }
  revalidateSite();
}

export async function deleteServiceZip(zip: string) {
  await prisma.serviceZip.delete({ where: { zip } }).catch(() => null);
  revalidateSite();
}

export async function toggleServiceZip(zip: string, active: boolean) {
  await prisma.serviceZip.update({ where: { zip }, data: { active } }).catch(() => null);
  revalidateSite();
}

// ── Deals & banner ──────────────────────────────────────────────────────────

export async function upsertDeal(form: FormData) {
  const id = str(form, 'id');
  const title = str(form, 'title');
  if (!title) return;
  const data = {
    slot: str(form, 'slot') === 'banner' ? 'banner' : 'offer',
    title,
    description: str(form, 'description'),
    badge: str(form, 'badge'),
    sortOrder: Number(str(form, 'sortOrder') ?? '0') || 0,
    active: form.get('active') === 'on' || !form.has('active__present'),
  };
  if (id) await prisma.deal.update({ where: { id }, data });
  else await prisma.deal.create({ data });
  revalidateSite();
}

export async function deleteDeal(id: string) {
  await prisma.deal.delete({ where: { id } }).catch(() => null);
  revalidateSite();
}

export async function toggleDeal(id: string, active: boolean) {
  await prisma.deal.update({ where: { id }, data: { active } }).catch(() => null);
  revalidateSite();
}

// ── Public plans ────────────────────────────────────────────────────────────

/** Edit a tier's displayed price/copy and whether it shows at all. */
export async function updateSitePlan(form: FormData) {
  const key = str(form, 'key');
  if (!key) return;
  const price = Number(str(form, 'monthlyPrice'));
  await prisma.sitePlan.update({
    where: { key },
    data: {
      ...(Number.isFinite(price) && price > 0 ? { monthlyPrice: price } : {}),
      tagline: str(form, 'tagline'),
      badge: str(form, 'badge'),
      active: form.get('active') === 'on',
    },
  });
  revalidateSite();
}

// ── Waitlist ────────────────────────────────────────────────────────────────

export async function setWaitlistContacted(id: string, contacted: boolean) {
  await prisma.waitlistEntry.update({ where: { id }, data: { contacted } }).catch(() => null);
  revalidatePath('/settings/website');
}

export async function deleteWaitlistEntry(id: string) {
  await prisma.waitlistEntry.delete({ where: { id } }).catch(() => null);
  revalidatePath('/settings/website');
}
