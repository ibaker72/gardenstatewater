'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getOwnerEmail } from '@/lib/env';
import { normalizePhone } from '@/lib/portal-auth';
import { zoneForZip } from './customers';
import type { Customer, SubscriptionPlan } from '@prisma/client';

const PLANS = new Set(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ON_DEMAND']);

/**
 * Public signup from the landing page. Creates the customer as PAUSED (no
 * deliveries until the owner confirms), files an inbox request, and emails
 * the owner — the same review flow as every other portal request.
 */
export async function submitSignup(form: FormData) {
  // Honeypot: bots fill every field; humans never see this one.
  if ((form.get('website') as string | null)?.trim()) redirect('/?signup=1');

  const name = (form.get('name') as string | null)?.trim();
  const phoneRaw = (form.get('phone') as string | null)?.trim() || null;
  const email = (form.get('email') as string | null)?.trim() || null;
  const address = (form.get('address') as string | null)?.trim();
  const city = (form.get('city') as string | null)?.trim() || null;
  const zip = (form.get('zip') as string | null)?.trim() || null;
  const planRaw = String(form.get('plan') ?? 'WEEKLY');
  const jugs = Math.min(10, Math.max(1, Math.round(Number(form.get('jugs')) || 2)));
  const message = (form.get('message') as string | null)?.trim() || null;

  if (!name || !address || (!phoneRaw && !email)) redirect('/?signup=error');
  const plan = (PLANS.has(planRaw) ? planRaw : 'WEEKLY') as SubscriptionPlan;

  // Same person signing up twice shouldn't create a duplicate customer.
  const phone = normalizePhone(phoneRaw);
  const candidates = await prisma.customer.findMany({
    where: { OR: [...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : [])] },
  });
  let existing: Customer | null = candidates[0] ?? null;
  if (!existing && phone) {
    const withPhones = await prisma.customer.findMany({ where: { phone: { not: null } } });
    existing = withPhones.find((c) => normalizePhone(c.phone) === phone) ?? null;
  }

  const detail = `Website signup — wants ${plan.toLowerCase().replace('_', '-')} delivery, ${jugs} jug${jugs === 1 ? '' : 's'}${message ? ` — "${message}"` : ''}`;

  const customer =
    existing ??
    (await prisma.customer.create({
      data: {
        name,
        phone: phoneRaw,
        email,
        address,
        city,
        zip,
        plan,
        planJugs: jugs,
        status: 'PAUSED', // no deliveries until the owner confirms the signup
        zoneId: (await zoneForZip(zip))?.id ?? null,
      },
    }));

  await prisma.portalRequest.create({
    data: { customerId: customer.id, kind: 'OTHER', detail },
  });

  const ownerEmail = getOwnerEmail();
  if (ownerEmail) {
    await sendEmail({
      to: ownerEmail,
      subject: `🎉 New signup: ${name}`,
      body: `${name} just signed up on gardenstatewater.com.\n\n${detail}\n\nAddress: ${address}${city ? `, ${city}` : ''}${zip ? ` ${zip}` : ''}\nPhone: ${phoneRaw ?? '—'}\nEmail: ${email ?? '—'}${existing ? '\n\n(Matched an existing customer — check their profile.)' : ''}\n\nConfirm them from the Portal requests page, then activate their account and send a portal invite.`,
      type: 'PORTAL_REQUEST',
      customerId: customer.id,
    });
  }

  revalidatePath('/requests');
  revalidatePath('/dashboard');
  redirect('/?signup=1');
}
