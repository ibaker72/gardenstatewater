'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getOwnerEmail } from '@/lib/env';
import { normalizePhone } from '@/lib/portal-auth';
import { getConfig, round2 } from '@/lib/pricing';
import { checkoutUrlForSignup, stripeConfigured } from '@/lib/stripe';
import { customerForReferralCode, ensureReferralCode } from '@/lib/referrals';
import { nextDeliveryDate, planToCrmFields } from '@/lib/signup-helpers';
import { normalizeZip } from '@/lib/service-area';
import { launchPlans } from '@/config/launch-service-area';
import { WEEKDAY_LABELS, signupSchema, type SignupInput, type SignupResult } from '@/lib/validation/signup';
import { zoneForZip } from './customers';
import type { AccountType, Customer } from '@prisma/client';

interface TierInfo {
  key: string;
  name: string;
  monthlyPrice: number;
  jugsPerMonth: number;
  isSubscription: boolean;
  customQuote: boolean;
}

async function loadTier(planKey: string): Promise<TierInfo | null> {
  const row = await prisma.sitePlan
    .findUnique({ where: { key: planKey } })
    .catch(() => null);
  if (row) {
    if (!row.active) return null;
    return {
      key: row.key,
      name: row.name,
      monthlyPrice: row.monthlyPrice,
      jugsPerMonth: row.jugsPerMonth,
      isSubscription: row.isSubscription,
      customQuote: row.customQuote,
    };
  }
  const fallback = launchPlans.find((p) => p.key === planKey);
  return fallback
    ? {
        key: fallback.key,
        name: fallback.name,
        monthlyPrice: fallback.monthlyPrice,
        jugsPerMonth: fallback.jugsPerMonth,
        isSubscription: fallback.isSubscription,
        customQuote: fallback.customQuote,
      }
    : null;
}

/** Zone auto-assignment: operational zone ZIP lists first, then the marketing ZIP's mapped zone. */
async function zoneIdForZip(zip: string): Promise<string | null> {
  const zone = await zoneForZip(zip);
  if (zone) return zone.id;
  const serviceZip = await prisma.serviceZip
    .findUnique({ where: { zip }, select: { zoneId: true } })
    .catch(() => null);
  return serviceZip?.zoneId ?? null;
}

/** Find an existing customer by email (case-insensitive) or phone digits. */
async function findExistingCustomer(email: string | null, phoneRaw: string | null) {
  let existing: Customer | null = email
    ? await prisma.customer.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    : null;
  const phone = normalizePhone(phoneRaw);
  if (!existing && phone) {
    const withPhones = await prisma.customer.findMany({ where: { phone: { not: null } } });
    existing = withPhones.find((c) => normalizePhone(c.phone) === phone) ?? null;
  }
  return existing;
}

/**
 * The public subscription signup.
 *
 * Creates (or matches) the customer in the CRM with their plan and
 * zone auto-assigned from ZIP, schedules the first delivery as a pending
 * order, files a "New signup" request in the owner inbox (the dashboard's
 * alert), credits referrals both ways, and hands off to Stripe Checkout with
 * the first-delivery discount. Without Stripe configured the signup still
 * completes — payment is simply collected on first delivery.
 */
export async function submitSignup(input: SignupInput): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'validation',
      message:
        parsed.error.issues[0]?.message ??
        'Some details look incomplete — please review the form and try again.',
    };
  }
  const data = parsed.data;

  // Honeypot filled → pretend success so bots learn nothing.
  if (data.website) return { ok: true, next: 'done', variant: 'subscription' };

  const zip = normalizeZip(data.zip);
  if (!zip) return { ok: false, error: 'validation', message: 'Enter a 5-digit ZIP code.' };

  try {
    const tier = await loadTier(data.planKey);
    if (!tier) {
      return {
        ok: false,
        error: 'validation',
        message: 'That plan is not available right now — please pick another.',
      };
    }

    // Referral: an entered-but-unknown code is surfaced, not silently dropped.
    const referralInput = data.referralCode?.trim() || null;
    const referrer = referralInput ? await customerForReferralCode(referralInput) : null;
    if (referralInput && !referrer) {
      return {
        ok: false,
        error: 'referral',
        message: 'We don’t recognize that referral code — double-check it or leave it blank.',
      };
    }

    const config = await getConfig();
    const email = data.contact.email?.trim() || null;
    const phoneRaw = data.contact.phone?.trim() || null;
    const accountType: AccountType = tier.customQuote ? 'COMMERCIAL' : 'RESIDENTIAL';
    const address = data.contact.addressLine2
      ? `${data.contact.streetAddress}, ${data.contact.addressLine2}`
      : data.contact.streetAddress;

    const existing = await findExistingCustomer(email, phoneRaw);
    const crm = planToCrmFields(tier, data.oneTimeJugs);
    const preferredDay = data.preferredDay ?? null;
    // Family & Office include the dispenser; others can add the rental.
    const dispenserIncluded = tier.isSubscription && tier.jugsPerMonth >= 8;
    const dispenserRental = dispenserIncluded || Boolean(data.addDispenserRental);

    const customer =
      existing ??
      (await prisma.customer.create({
        data: {
          name: data.contact.fullName,
          phone: phoneRaw,
          email,
          address,
          city: data.contact.city,
          zip,
          accountType,
          plan: crm.plan,
          planJugs: crm.planJugs,
          preferredDay,
          deliveryNotes: data.contact.deliveryNotes?.trim() || null,
          // Quote requests wait for the owner; paid signups start active.
          status: tier.customQuote ? 'PAUSED' : 'ACTIVE',
          dispenserRental,
          zoneId: await zoneIdForZip(zip),
          // Brand-new customer, so a valid referrer can never be themselves.
          referredById: referrer?.id ?? null,
        },
      }));

    // A returning customer signing up again: refresh their plan selection.
    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: { plan: crm.plan, planJugs: crm.planJugs, preferredDay, dispenserRental },
      });
    }

    // Referral credits, both ways — new customers only, never self-referrals.
    if (referrer && !existing && referrer.id !== customer.id) {
      await prisma.referralCredit.createMany({
        data: [
          { customerId: referrer.id, jugs: 1, reason: `Referred ${customer.name}` },
          { customerId: customer.id, jugs: 1, reason: `Signed up with code ${referrer.referralCode}` },
        ],
      });
    }

    // Every customer gets a shareable code of their own from day one.
    await ensureReferralCode(customer.id).catch(() => null);

    // First order: scheduled as pending for the owner's approval.
    let orderId: string | null = null;
    if (!tier.customQuote) {
      const deliveryDate = nextDeliveryDate(preferredDay);
      if (tier.isSubscription) {
        const order = await prisma.order.create({
          data: {
            customerId: customer.id,
            deliveryDate,
            status: 'SCHEDULED',
            fromSubscription: true,
            instructions: 'New website signup — confirm before delivery. Billed via subscription.',
            subtotal: 0,
            total: 0,
            items: {
              create: [
                {
                  productType: 'JUG_REFILL',
                  description: `First delivery ×${crm.planJugs} (covered by ${tier.name} subscription, first delivery ${Math.round(config.firstDeliveryDiscountPct)}% off)`,
                  quantity: crm.planJugs,
                  unitPrice: 0,
                  lineTotal: 0,
                },
              ],
            },
          },
        });
        orderId = order.id;
      } else {
        const jugs = Math.max(1, data.oneTimeJugs ?? 2);
        const subtotal = round2(jugs * config.oneTimeJugPrice);
        const fee = config.oneTimeDeliveryFee;
        const order = await prisma.order.create({
          data: {
            customerId: customer.id,
            deliveryDate: nextDeliveryDate(preferredDay),
            status: 'SCHEDULED',
            instructions: 'New website signup (one-time delivery) — confirm before delivery.',
            subtotal,
            deliveryFee: fee,
            total: round2(subtotal + fee),
            items: {
              create: [
                {
                  productType: 'JUG_REFILL',
                  description: `5-gal jug ×${jugs} (one-time delivery)`,
                  quantity: jugs,
                  unitPrice: config.oneTimeJugPrice,
                  lineTotal: subtotal,
                },
              ],
            },
          },
        });
        orderId = order.id;
      }
    }

    // The "New Signup" alert: an unresolved request surfaces on the admin
    // dashboard and in the Requests inbox.
    const detailParts = [
      tier.customQuote ? `Office/commercial quote request (${tier.name})` : `New website signup — ${tier.name}`,
      tier.isSubscription && !tier.customQuote ? `billing: ${data.billing}` : null,
      !tier.isSubscription ? `jugs: ${Math.max(1, data.oneTimeJugs ?? 2)}` : null,
      preferredDay !== null ? `preferred day: ${WEEKDAY_LABELS[preferredDay]}` : null,
      dispenserRental ? 'dispenser: yes' : null,
      referrer ? `referral: ${referrer.referralCode} (${referrer.name})` : null,
      data.contact.deliveryNotes ? `notes: "${data.contact.deliveryNotes}"` : null,
    ].filter(Boolean);
    await prisma.portalRequest.create({
      data: { customerId: customer.id, kind: 'NEW_SIGNUP', detail: detailParts.join(' — ') },
    });

    const ownerEmail = getOwnerEmail();
    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: tier.customQuote
          ? `Quote request: ${customer.name} (${tier.name})`
          : `New signup: ${customer.name} — ${tier.name}`,
        body: `${customer.name} signed up on gardenstatewater.com.\n\n${detailParts.join('\n')}\n\nAddress: ${address}, ${data.contact.city} ${zip}\nPhone: ${phoneRaw ?? '—'}\nEmail: ${email ?? '—'}${existing ? '\n\n(Matched an existing customer — check their profile.)' : ''}\n\nTheir first order is scheduled as pending — confirm it from the Orders page.`,
        type: 'PORTAL_REQUEST',
        customerId: customer.id,
      });
    }

    revalidatePath('/requests');
    revalidatePath('/dashboard');
    revalidatePath('/orders');

    if (tier.customQuote) return { ok: true, next: 'done', variant: 'quote' };

    // Stripe checkout with the first-delivery discount; without Stripe the
    // signup still completes and payment is collected on first delivery.
    if (stripeConfigured()) {
      const url = await checkoutUrlForSignup({
        customerId: customer.id,
        planKey: tier.key,
        billing: data.billing,
        oneTimeJugs: data.oneTimeJugs,
        orderId,
      }).catch((error) => {
        console.error('[signup] Stripe checkout creation failed:', error);
        return null;
      });
      if (url) return { ok: true, next: 'checkout', url };
    }

    return { ok: true, next: 'done', variant: tier.isSubscription ? 'subscription' : 'one_time' };
  } catch (error) {
    console.error('[signup] submission failed:', error);
    return {
      ok: false,
      error: 'server',
      message: 'We could not complete your signup just now. Please try again in a moment.',
    };
  }
}
