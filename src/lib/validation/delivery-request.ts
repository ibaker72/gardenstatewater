import { z } from 'zod';

/**
 * The multi-step delivery request, validated identically on the client (for
 * inline errors) and on the server (as the source of truth).
 */

export const ZIP_RE = /^\d{5}$/;

export const customerTypes = ['home', 'business'] as const;
export type CustomerType = (typeof customerTypes)[number];

export const frequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ONE_TIME', 'NOT_SURE'] as const;
export type Frequency = (typeof frequencies)[number];

export const quantities = ['1', '2', '3', '4', '5_PLUS', 'NOT_SURE'] as const;
export type Quantity = (typeof quantities)[number];

export const dispenserChoices = ['HAVE_ONE', 'BOTTOM_LOAD', 'COUNTERTOP', 'HELP_CHOOSING', 'NONE'] as const;
export type DispenserChoice = (typeof dispenserChoices)[number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every two weeks',
  MONTHLY: 'Monthly',
  ONE_TIME: 'One-time',
  NOT_SURE: 'Not sure yet',
};

export const QUANTITY_LABELS: Record<Quantity, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5_PLUS': '5+',
  NOT_SURE: 'Not sure yet',
};

export const DISPENSER_LABELS: Record<DispenserChoice, string> = {
  HAVE_ONE: 'I already have one',
  BOTTOM_LOAD: 'Bottom-load dispenser',
  COUNTERTOP: 'Countertop dispenser',
  HELP_CHOOSING: 'I need help choosing',
  NONE: 'No dispenser needed',
};

const trimmed = (max: number) => z.string().trim().max(max);

export const locationStepSchema = z.object({
  zip: z.string().trim().regex(ZIP_RE, 'Enter a 5-digit ZIP code.'),
  customerType: z.enum(customerTypes),
});

export const needsStepSchema = z.object({
  frequency: z.enum(frequencies),
  quantity: z.enum(quantities),
  dispenser: z.enum(dispenserChoices),
});

export const contactStepSchema = z
  .object({
    fullName: trimmed(120).min(2, 'Please enter your name.'),
    phone: trimmed(30).optional().or(z.literal('')),
    email: trimmed(160).optional().or(z.literal('')),
    streetAddress: trimmed(200).min(4, 'Please enter your street address.'),
    addressLine2: trimmed(100).optional().or(z.literal('')),
    city: trimmed(80).min(2, 'Please enter your city.'),
    deliveryNotes: trimmed(400).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    const phoneDigits = (value.phone ?? '').replace(/\D/g, '');
    const hasPhone = phoneDigits.length >= 10 && phoneDigits.length <= 11;
    const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email ?? '');
    if (!value.phone && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Add a phone number or an email so we can confirm your delivery.',
      });
      return;
    }
    if (value.phone && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'That phone number doesn’t look complete.',
      });
    }
    if (value.email && !hasEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'That email address doesn’t look right.',
      });
    }
  });

export const deliveryRequestSchema = z.object({
  ...locationStepSchema.shape,
  ...needsStepSchema.shape,
  contact: contactStepSchema,
  /** Result of the ZIP availability check, carried through for the owner. */
  serviceAreaStatus: z.enum(['active', 'upcoming', 'unavailable', 'manual_review']).nullable(),
  /**
   * Honeypot — humans never see the field, so any value means a bot. The
   * schema accepts it so the server can return a decoy success instead of a
   * validation error the bot could learn from.
   */
  website: z.string().max(200).optional(),
});

export type DeliveryRequestInput = z.infer<typeof deliveryRequestSchema>;
export type ContactInput = z.infer<typeof contactStepSchema>;

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: 'validation' | 'server'; message: string };
