'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getOwnerEmail } from '@/lib/env';
import { normalizeZip, resolvePublicArea, type PublicAreaCheck } from '@/lib/service-area';

/**
 * Public ZIP availability check for the landing page.
 *
 * Returns only a coarse status plus the town name — never zone names,
 * delivery days, fees, or anything else about route internals. Database
 * failures degrade to 'manual_review' so the page keeps working and no error
 * details leak.
 */
export async function checkServiceArea(rawZip: string): Promise<PublicAreaCheck> {
  const zip = normalizeZip(rawZip);
  if (!zip) return { status: 'manual_review' };

  try {
    const [match, anyActive, zones] = await Promise.all([
      prisma.serviceZip.findUnique({
        where: { zip },
        select: { zip: true, town: true, state: true, active: true },
      }),
      prisma.serviceZip.findFirst({ where: { active: true }, select: { zip: true } }),
      prisma.zone.findMany({ select: { zips: true } }),
    ]);
    return resolvePublicArea(zip, match, zones.map((zn) => zn.zips), anyActive !== null);
  } catch {
    return { status: 'manual_review' };
  }
}

const waitlistSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 11;
    }, 'That phone number doesn’t look complete.'),
  zip: z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code.'),
  /** Honeypot: humans never see it, so any value means a bot. */
  website: z.string().max(200).optional(),
});

export type WaitlistResult = { ok: true } | { ok: false; message: string };

/**
 * "We're not in your ZIP yet" → waitlist capture. Feeds the expansion-planning
 * list in Settings → Website and pings the owner.
 */
export async function joinWaitlist(input: {
  name: string;
  phone: string;
  zip: string;
  website?: string;
}): Promise<WaitlistResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Please check your details and try again.',
    };
  }
  const data = parsed.data;
  if (data.website) return { ok: true }; // bot decoy

  try {
    // The ZIP might be known-but-inactive; record the town when we have it.
    const known = await prisma.serviceZip
      .findUnique({ where: { zip: data.zip }, select: { town: true } })
      .catch(() => null);

    // One row per phone+zip — resubmitting is a no-op, not a duplicate.
    const digits = data.phone.replace(/\D/g, '');
    const sameZip = await prisma.waitlistEntry.findMany({
      where: { zip: data.zip },
      select: { phone: true },
    });
    const alreadyListed = sameZip.some((entry) => entry.phone.replace(/\D/g, '') === digits);

    if (!alreadyListed) {
      await prisma.waitlistEntry.create({
        data: {
          name: data.name,
          phone: data.phone,
          zip: data.zip,
          town: known?.town ?? null,
          source: 'homepage',
        },
      });

      const ownerEmail = getOwnerEmail();
      if (ownerEmail) {
        await sendEmail({
          to: ownerEmail,
          subject: `Waitlist signup: ${data.zip}${known?.town ? ` (${known.town})` : ''}`,
          body: `${data.name} joined the expansion waitlist.\n\nZIP: ${data.zip}\nPhone: ${data.phone}\n\nSee the full list in Settings → Website.`,
          type: 'OTHER',
        });
      }
      revalidatePath('/settings/website');
    }
    return { ok: true };
  } catch (error) {
    console.error('[waitlist] signup failed:', error);
    return { ok: false, message: 'We could not save that just now. Please try again in a moment.' };
  }
}
