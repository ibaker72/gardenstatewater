import { createHash, randomBytes, randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Customer } from '@prisma/client';
import { prisma } from './prisma';
import { sendEmail, sendSms } from './email';

/**
 * Customer portal authentication.
 *
 * Login options, in order of preference:
 *  1. 6-digit one-time code sent by SMS (or email) — expires in 10 minutes,
 *     5 verify attempts per code, max 5 codes per customer per hour.
 *  2. 4-digit PIN the owner sets on the customer profile (fallback for
 *     customers with no reachable phone/email).
 *  3. Invite link (?token=<portalToken>) — the long-lived unguessable token
 *     the owner texts out; opening it starts a session directly.
 *
 * Sessions last 30 days. The browser cookie holds a random token; only its
 * sha256 is stored, so a database leak can't hijack live sessions.
 */

export const PORTAL_SESSION_COOKIE = 'gsw_portal';
const SESSION_DAYS = 30;
const CODE_TTL_MINUTES = 10;
const MAX_CODES_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Normalize US phone input to its 10 significant digits (or null). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export function hashPin(customerId: string, pin: string): string {
  return sha256(`${customerId}:${pin}`);
}

/** Find an active-portal customer by the phone number or email they typed. */
export async function findCustomerByIdentifier(identifier: string): Promise<Customer | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes('@')) {
    const customer = await prisma.customer.findFirst({
      where: { email: { equals: trimmed, mode: 'insensitive' } },
    });
    return customer?.portalAccess ? customer : null;
  }

  const phone = normalizePhone(trimmed);
  if (!phone) return null;
  // Stored formats vary ("(973) 555-0142") — normalize in memory; the
  // customer base is small enough that this stays instant.
  const candidates = await prisma.customer.findMany({ where: { phone: { not: null } } });
  const customer = candidates.find((c) => normalizePhone(c.phone) === phone) ?? null;
  return customer?.portalAccess ? customer : null;
}

export type RequestCodeResult =
  | { ok: true; channel: 'sms' | 'email' | 'console' }
  | { ok: false; reason: 'not-found' | 'rate-limited' | 'unreachable' };

/**
 * Create and send a login code. Callers should show the same neutral
 * "if we found your account, a code is on the way" message for every
 * outcome so the endpoint can't be used to probe which numbers exist.
 */
export async function requestLoginCode(identifier: string): Promise<RequestCodeResult> {
  const customer = await findCustomerByIdentifier(identifier);
  if (!customer) return { ok: false, reason: 'not-found' };

  const recentCodes = await prisma.portalLoginCode.count({
    where: { customerId: customer.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (recentCodes >= MAX_CODES_PER_HOUR) {
    console.warn(`[portal-auth] Rate limit hit for customer ${customer.id}`);
    return { ok: false, reason: 'rate-limited' };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const body = `Your Garden State Water sign-in code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes. If you didn't request it, you can ignore this message.`;

  let channel: 'sms' | 'email' | 'console';
  if (customer.phone) {
    const smsConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID);
    channel = smsConfigured ? 'sms' : customer.email ? 'email' : 'console';
    await sendSms({
      to: customer.phone,
      body,
      type: 'OTHER',
      customerId: customer.id,
      fallbackEmail: customer.email,
    });
  } else if (customer.email) {
    channel = 'email';
    await sendEmail({
      to: customer.email,
      subject: 'Your Garden State Water sign-in code',
      body,
      type: 'OTHER',
      customerId: customer.id,
    });
  } else {
    return { ok: false, reason: 'unreachable' };
  }

  await prisma.portalLoginCode.create({
    data: {
      customerId: customer.id,
      codeHash: sha256(`${customer.id}:${code}`),
      channel,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    },
  });

  return { ok: true, channel };
}

export type VerifyResult =
  | { ok: true; customer: Customer }
  | { ok: false; reason: 'invalid' | 'expired' | 'too-many-attempts' };

/** Check a 6-digit code and consume it on success. */
export async function verifyLoginCode(identifier: string, code: string): Promise<VerifyResult> {
  const customer = await findCustomerByIdentifier(identifier);
  if (!customer) return { ok: false, reason: 'invalid' };

  const latest = await prisma.portalLoginCode.findFirst({
    where: { customerId: customer.id, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return { ok: false, reason: 'invalid' };
  if (latest.expiresAt < new Date()) return { ok: false, reason: 'expired' };
  if (latest.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: 'too-many-attempts' };

  if (latest.codeHash !== sha256(`${customer.id}:${code.trim()}`)) {
    await prisma.portalLoginCode.update({
      where: { id: latest.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: 'invalid' };
  }

  await prisma.portalLoginCode.update({
    where: { id: latest.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true, customer };
}

/** PIN fallback: phone/email + the 4-digit PIN the owner set. */
export async function verifyPin(identifier: string, pin: string): Promise<VerifyResult> {
  const customer = await findCustomerByIdentifier(identifier);
  if (!customer?.portalPin) return { ok: false, reason: 'invalid' };

  // PINs share the code rate limit: 5 bad tries per hour per customer.
  const recentFailures = await prisma.portalLoginCode.count({
    where: {
      customerId: customer.id,
      channel: 'pin-attempt',
      createdAt: { gte: new Date(Date.now() - 3_600_000) },
    },
  });
  if (recentFailures >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: 'too-many-attempts' };

  if (customer.portalPin !== hashPin(customer.id, pin.trim())) {
    await prisma.portalLoginCode.create({
      data: {
        customerId: customer.id,
        codeHash: 'pin-failure',
        channel: 'pin-attempt',
        expiresAt: new Date(),
      },
    });
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, customer };
}

/** Invite/legacy link: the customer's long-lived portal token. */
export async function customerByPortalToken(token: string): Promise<Customer | null> {
  const customer = await prisma.customer.findUnique({ where: { portalToken: token } });
  return customer?.portalAccess ? customer : null;
}

/** Start a 30-day session and set the cookie. Call from a route handler or server action. */
export async function createPortalSession(customerId: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.$transaction([
    prisma.portalSession.create({
      data: { customerId, tokenHash: sha256(token), expiresAt },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { portalLastLoginAt: new Date() },
    }),
  ]);
  (await cookies()).set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
}

/** The logged-in portal customer for this request, or null. Never throws. */
export async function getPortalCustomer(): Promise<Customer | null> {
  try {
    const token = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await prisma.portalSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { customer: true },
    });
    if (!session || session.expiresAt < new Date() || !session.customer.portalAccess) return null;
    // Refresh lastSeenAt at most hourly to avoid a write on every request.
    if (Date.now() - session.lastSeenAt.getTime() > 3_600_000) {
      await prisma.portalSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }
    return session.customer;
  } catch {
    return null;
  }
}

/** Log out: delete the session row and clear the cookie. */
export async function destroyPortalSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(PORTAL_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.portalSession.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  store.delete(PORTAL_SESSION_COOKIE);
}
