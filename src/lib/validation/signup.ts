import { z } from 'zod';
import { contactStepSchema } from './delivery-request';

/**
 * The subscription signup flow, validated identically on the client (inline
 * errors) and on the server (source of truth). Prices are NEVER part of this
 * input — the server reprices everything from the database.
 */

export const billingChoices = ['monthly', 'annual'] as const;
export type BillingChoice = (typeof billingChoices)[number];

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const signupSchema = z.object({
  zip: z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code.'),
  planKey: z.string().trim().min(1).max(40),
  billing: z.enum(billingChoices).default('monthly'),
  /** One-time deliveries only: how many jugs to bring. */
  oneTimeJugs: z.number().int().min(1).max(12).optional(),
  /** 0=Sun..6=Sat; null = "whichever day the route runs". */
  preferredDay: z.number().int().min(0).max(6).nullable().optional(),
  addDispenserRental: z.boolean().optional(),
  referralCode: z.string().trim().max(20).optional().or(z.literal('')),
  contact: contactStepSchema,
  /** Honeypot — humans never see the field, so any value means a bot. */
  website: z.string().max(200).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export type SignupSuccessVariant = 'subscription' | 'one_time' | 'quote';

export type SignupResult =
  | { ok: true; next: 'checkout'; url: string }
  | { ok: true; next: 'done'; variant: SignupSuccessVariant }
  | { ok: false; error: 'validation' | 'referral' | 'unserviceable' | 'server'; message: string };
