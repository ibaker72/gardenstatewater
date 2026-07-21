import { randomInt } from 'crypto';
import { prisma } from './prisma';

/**
 * Referral program: every customer gets one shareable code; a new signup that
 * enters it earns a free-jug credit for both sides. Codes avoid ambiguous
 * characters (0/O, 1/I/L) so they survive being read out loud.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_RE = /^GSW-[A-Z0-9]{6}$/i;

/** A fresh "GSW-XXXXXX" code (uniqueness is enforced by the DB constraint). */
export function generateReferralCode(rng: (max: number) => number = randomInt): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) suffix += CODE_ALPHABET[rng(CODE_ALPHABET.length)];
  return `GSW-${suffix}`;
}

/** Normalize user input ("gsw-ab12cd " → "GSW-AB12CD"), or null when malformed. */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const code = raw?.trim().toUpperCase() ?? '';
  return REFERRAL_CODE_RE.test(code) ? code : null;
}

/**
 * Get the customer's referral code, minting one on first use. Retries on the
 * (astronomically unlikely) unique-constraint collision.
 */
export async function ensureReferralCode(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { referralCode: true },
  });
  if (customer.referralCode) return customer.referralCode;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    try {
      await prisma.customer.update({ where: { id: customerId }, data: { referralCode: code } });
      return code;
    } catch {
      // collision — try another code
    }
  }
  throw new Error('Could not allocate a referral code');
}

/** Look up the owning customer of a referral code (case-insensitive). */
export async function customerForReferralCode(raw: string | null | undefined) {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  return prisma.customer.findFirst({
    where: { referralCode: { equals: code, mode: 'insensitive' } },
    select: { id: true, name: true, referralCode: true },
  });
}
