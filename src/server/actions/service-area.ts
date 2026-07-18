'use server';

import { prisma } from '@/lib/prisma';
import { normalizeZip, resolveServiceAreaStatus, type PublicAreaCheck } from '@/lib/service-area';

/**
 * Public ZIP availability check for the landing page.
 *
 * Returns only a coarse status — never zone names, delivery days, fees, or
 * anything else about route internals. Database failures degrade to
 * 'manual_review' so the page keeps working and no error details leak.
 */
export async function checkServiceArea(rawZip: string): Promise<PublicAreaCheck> {
  const zip = normalizeZip(rawZip);
  if (!zip) return { status: 'manual_review' };

  try {
    const zones = await prisma.zone.findMany({ select: { zips: true } });
    return { status: resolveServiceAreaStatus(zip, zones.map((z) => z.zips)) };
  } catch {
    return { status: 'manual_review' };
  }
}
