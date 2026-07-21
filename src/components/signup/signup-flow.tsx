'use client';

import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { consentCopy } from '@/config/marketing-content';
import { contactStepSchema } from '@/lib/validation/delivery-request';
import { WEEKDAY_LABELS, type BillingChoice } from '@/lib/validation/signup';
import type { PublicAddOns, PublicPlan } from '@/lib/marketing';
import {
  annualMonthlyEquivalent,
  annualPrice,
  displayPrice,
  perJugPrice,
} from '@/lib/plan-pricing';
import { submitSignup } from '@/server/actions/signup';
import { fieldError, fieldLabel, inputBase } from '@/components/marketing/styles';
import { SignupProgress } from './signup-progress';
import { OptionCards } from './option-cards';

const btnContinue =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-blue px-7 text-base font-semibold text-white transition-colors hover:bg-brand-bluedark disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy';
const btnBack =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand-line bg-white px-5 text-base font-semibold text-brand-navy transition-colors hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

interface ContactState {
  fullName: string;
  phone: string;
  email: string;
  streetAddress: string;
  addressLine2: string;
  city: string;
  deliveryNotes: string;
}

const EMPTY_CONTACT: ContactState = {
  fullName: '',
  phone: '',
  email: '',
  streetAddress: '',
  addressLine2: '',
  city: '',
  deliveryNotes: '',
};

/**
 * The subscription signup: plan → details → review & referral → Stripe
 * checkout. The ZIP is validated by the server page before this renders, so
 * the flow starts on plan selection. All pricing shown here is display-only —
 * the server reprices from the database at submit time.
 */
export function SignupFlow({
  plans,
  addOns,
  zip,
  town,
  initialPlanKey,
  initialBilling,
  canceled,
}: {
  plans: PublicPlan[];
  addOns: PublicAddOns;
  zip: string;
  town: string | null;
  initialPlanKey: string | null;
  initialBilling: BillingChoice;
  canceled: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [planKey, setPlanKey] = useState<string | null>(
    initialPlanKey && plans.some((p) => p.key === initialPlanKey) ? initialPlanKey : null
  );
  const [billing, setBilling] = useState<BillingChoice>(initialBilling);
  const [oneTimeJugs, setOneTimeJugs] = useState(2);
  const [contact, setContact] = useState<ContactState>(EMPTY_CONTACT);
  const [preferredDay, setPreferredDay] = useState<number | null>(null);
  const [addDispenserRental, setAddDispenserRental] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const plan = plans.find((p) => p.key === planKey) ?? null;
  const dispenserIncluded = Boolean(plan?.isSubscription && plan.jugsPerMonth >= 8);

  const setContactField = <K extends keyof ContactState>(key: K, value: string) => {
    setContact((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  function continueFromPlan() {
    if (!plan) {
      setErrors({ plan: 'Choose a plan to continue.' });
      return;
    }
    setErrors({});
    setStep(2);
  }

  function continueFromDetails(event: FormEvent) {
    event.preventDefault();
    const parsed = contactStepSchema.safeParse(contact);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStep(3);
  }

  async function submit() {
    if (submitting || !plan) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitSignup({
        zip,
        planKey: plan.key,
        billing,
        oneTimeJugs: plan.isSubscription ? undefined : oneTimeJugs,
        preferredDay,
        addDispenserRental: dispenserIncluded ? false : addDispenserRental,
        referralCode,
        contact,
        website,
      });
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      if (result.next === 'checkout') {
        window.location.assign(result.url);
        return;
      }
      router.push(`/signup/success?v=${result.variant}`);
    } catch {
      setSubmitError('We could not complete your signup just now. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">Signup</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">
          Let’s get water to {town ?? `ZIP ${zip}`}.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-brand-ink">
          Delivering to <strong>{town ? `${town} (${zip})` : zip}</strong> ·{' '}
          <a href="/signup" className="font-semibold text-brand-blue hover:underline">
            change ZIP
          </a>
        </p>
      </div>

      {canceled && (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-[15px] font-medium text-amber-900">
          Checkout was canceled — your details are safe to re-enter, and nothing was charged.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-brand-line bg-white p-6 shadow-[0_18px_50px_-24px_rgba(11,41,69,0.2)] sm:p-8">
        <SignupProgress current={step} />

        {step === 1 && (
          <form
            className="mt-7 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              continueFromPlan();
            }}
            noValidate
          >
            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-brand-navy">Pick your plan</legend>
              <div className="grid gap-3">
                {plans.map((p) => {
                  const selected = planKey === p.key;
                  const priceLine = p.customQuote
                    ? `from ${displayPrice(p.monthlyPrice)}/month · custom quote`
                    : p.priceUnit === 'jug'
                      ? `${displayPrice(p.monthlyPrice)}/jug + ${displayPrice(addOns.oneTimeDeliveryFee)} delivery`
                      : billing === 'annual'
                        ? `${displayPrice(annualMonthlyEquivalent(p.monthlyPrice, addOns.annualFreeMonths))}/mo billed yearly (${displayPrice(annualPrice(p.monthlyPrice, addOns.annualFreeMonths))})`
                        : `${displayPrice(p.monthlyPrice)}/month · ${displayPrice(perJugPrice(p.monthlyPrice, p.jugsPerMonth))}/jug`;
                  return (
                    <label
                      key={p.key}
                      className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 transition-colors ${
                        selected
                          ? 'border-brand-blue bg-brand-aqua'
                          : 'border-brand-line bg-white hover:border-brand-blue/50'
                      }`}
                    >
                      <span>
                        <span className="flex flex-wrap items-center gap-2 font-semibold text-brand-navy">
                          {p.name}
                          {p.badge && (
                            <span className="rounded-full bg-brand-blue px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                              {p.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-sm text-brand-ink">{priceLine}</span>
                        {p.tagline && <span className="mt-0.5 block text-sm text-brand-ink/80">{p.tagline}</span>}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          selected ? 'border-brand-blue bg-brand-blue text-white' : 'border-brand-line bg-white'
                        }`}
                      >
                        {selected && <Check size={14} />}
                      </span>
                      <input
                        type="radio"
                        name="signup-plan"
                        value={p.key}
                        checked={selected}
                        onChange={() => setPlanKey(p.key)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
              {errors.plan && <p className={fieldError}>{errors.plan}</p>}
            </fieldset>

            {plan?.isSubscription && !plan.customQuote && (
              <OptionCards
                legend="Billing"
                name="signup-billing"
                columns={2}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'annual', label: `Annual — ${addOns.annualFreeMonths} month${addOns.annualFreeMonths === 1 ? '' : 's'} free` },
                ]}
                value={billing}
                onChange={(v) => setBilling(v)}
              />
            )}

            {plan && !plan.isSubscription && (
              <OptionCards
                legend="How many jugs?"
                name="signup-jugs"
                options={['1', '2', '3', '4', '5', '6'].map((n) => ({ value: n, label: n }))}
                value={String(oneTimeJugs)}
                onChange={(v) => setOneTimeJugs(Number(v))}
              />
            )}

            {plan && !plan.customQuote && (
              <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                <Sparkles size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                {plan.isSubscription
                  ? `First delivery ${Math.round(addOns.firstDeliveryDiscountPct)}% off — applied automatically at checkout.`
                  : 'One-time deliveries are the full-price way to try us — subscriptions get the 50% first-delivery offer.'}
              </p>
            )}

            <div className="flex justify-end">
              <button type="submit" className={btnContinue}>
                Continue <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-7 space-y-4" onSubmit={continueFromDetails} noValidate>
            {/* Honeypot — visually hidden, never announced, ignored by humans */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="signup-website">Website</label>
              <input
                id="signup-website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="signup-name" className={fieldLabel}>
                Full name
              </label>
              <input
                id="signup-name"
                value={contact.fullName}
                onChange={(e) => setContactField('fullName', e.target.value)}
                autoComplete="name"
                aria-invalid={errors.fullName ? true : undefined}
                className={inputBase}
              />
              {errors.fullName && <p className={fieldError}>{errors.fullName}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-phone" className={fieldLabel}>
                  Mobile number
                </label>
                <input
                  id="signup-phone"
                  value={contact.phone}
                  onChange={(e) => setContactField('phone', e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={errors.phone ? true : undefined}
                  className={inputBase}
                />
                {errors.phone && <p className={fieldError}>{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="signup-email" className={fieldLabel}>
                  Email
                </label>
                <input
                  id="signup-email"
                  value={contact.email}
                  onChange={(e) => setContactField('email', e.target.value)}
                  type="email"
                  autoComplete="email"
                  aria-invalid={errors.email ? true : undefined}
                  className={inputBase}
                />
                {errors.email && <p className={fieldError}>{errors.email}</p>}
              </div>
            </div>
            <p className="text-sm text-brand-ink">
              We text delivery reminders the night before — a mobile number keeps you in the loop.
            </p>

            <div>
              <label htmlFor="signup-street" className={fieldLabel}>
                Street address
              </label>
              <input
                id="signup-street"
                value={contact.streetAddress}
                onChange={(e) => setContactField('streetAddress', e.target.value)}
                autoComplete="address-line1"
                aria-invalid={errors.streetAddress ? true : undefined}
                className={inputBase}
              />
              {errors.streetAddress && <p className={fieldError}>{errors.streetAddress}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
              <div>
                <label htmlFor="signup-line2" className={fieldLabel}>
                  Apt / suite <span className="font-normal text-brand-ink">(optional)</span>
                </label>
                <input
                  id="signup-line2"
                  value={contact.addressLine2}
                  onChange={(e) => setContactField('addressLine2', e.target.value)}
                  autoComplete="address-line2"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor="signup-city" className={fieldLabel}>
                  City
                </label>
                <input
                  id="signup-city"
                  value={contact.city}
                  onChange={(e) => setContactField('city', e.target.value)}
                  autoComplete="address-level2"
                  aria-invalid={errors.city ? true : undefined}
                  className={inputBase}
                />
                {errors.city && <p className={fieldError}>{errors.city}</p>}
              </div>
              <div>
                <label htmlFor="signup-zip" className={fieldLabel}>
                  ZIP
                </label>
                <input id="signup-zip" value={zip} readOnly className={`${inputBase} bg-brand-mist`} />
              </div>
            </div>

            <div>
              <label htmlFor="signup-day" className={fieldLabel}>
                Preferred delivery day
              </label>
              <select
                id="signup-day"
                value={preferredDay === null ? '' : String(preferredDay)}
                onChange={(e) => setPreferredDay(e.target.value === '' ? null : Number(e.target.value))}
                className={inputBase}
              >
                <option value="">Whichever day the route runs</option>
                {WEEKDAY_LABELS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {!plan?.customQuote && !dispenserIncluded && (
              <label className="flex items-start gap-3 rounded-xl border border-brand-line bg-brand-mist p-4 text-[15px] text-brand-navy">
                <input
                  type="checkbox"
                  checked={addDispenserRental}
                  onChange={(e) => setAddDispenserRental(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="font-semibold">
                    Add a dispenser rental — {displayPrice(addOns.dispenserRentalPrice)}/month
                  </span>
                  <span className="mt-0.5 block text-sm text-brand-ink">
                    Delivered and set up with your first order. Skip it if you already own one.
                  </span>
                </span>
              </label>
            )}
            {dispenserIncluded && (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                Free dispenser rental is included with this plan — we’ll bring one with your first delivery.
              </p>
            )}

            <div>
              <label htmlFor="signup-notes" className={fieldLabel}>
                Delivery notes <span className="font-normal text-brand-ink">(optional)</span>
              </label>
              <textarea
                id="signup-notes"
                value={contact.deliveryNotes}
                onChange={(e) => setContactField('deliveryNotes', e.target.value)}
                rows={2}
                maxLength={400}
                placeholder="Gate codes, building access, preferred drop-off spot…"
                className="w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-base text-brand-navy placeholder:text-brand-ink/60 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(1)} className={btnBack}>
                <ArrowLeft size={18} aria-hidden="true" /> Back
              </button>
              <button type="submit" className={btnContinue}>
                Continue <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        )}

        {step === 3 && plan && (
          <form
            className="mt-7 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            noValidate
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-brand-line bg-brand-mist p-5 text-[15px]">
              <div className="col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Plan</dt>
                <dd className="font-semibold text-brand-navy">
                  {plan.name}
                  {plan.customQuote
                    ? ` — custom quote (from ${displayPrice(plan.monthlyPrice)}/month)`
                    : plan.isSubscription
                      ? billing === 'annual'
                        ? ` — ${displayPrice(annualPrice(plan.monthlyPrice, addOns.annualFreeMonths))}/year (${addOns.annualFreeMonths} month${addOns.annualFreeMonths === 1 ? '' : 's'} free)`
                        : ` — ${displayPrice(plan.monthlyPrice)}/month`
                      : ` — ${oneTimeJugs} jug${oneTimeJugs === 1 ? '' : 's'} · ${displayPrice(oneTimeJugs * addOns.oneTimeJugPrice + addOns.oneTimeDeliveryFee)} incl. delivery`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Deliver to</dt>
                <dd className="font-semibold text-brand-navy">
                  {contact.streetAddress}, {contact.city} {zip}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Delivery day</dt>
                <dd className="font-semibold text-brand-navy">
                  {preferredDay === null ? 'Route day' : WEEKDAY_LABELS[preferredDay]}
                </dd>
              </div>
            </dl>

            {!plan.customQuote && plan.isSubscription && (
              <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                <Sparkles size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                Your first delivery is {Math.round(addOns.firstDeliveryDiscountPct)}% off — the discount
                is applied automatically at checkout.
              </p>
            )}

            <div>
              <label htmlFor="signup-referral" className={fieldLabel}>
                Referral code <span className="font-normal text-brand-ink">(optional)</span>
              </label>
              <input
                id="signup-referral"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="GSW-XXXXXX"
                autoComplete="off"
                className={inputBase}
              />
              <p className="mt-1.5 text-sm text-brand-ink">
                Referred by a neighbor? Enter their code and you both get a free jug.
              </p>
            </div>

            <p className="text-[13px] leading-relaxed text-brand-ink">{consentCopy}</p>

            <div aria-live="polite">
              {submitError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-[15px] font-medium text-red-700">
                  {submitError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className={btnBack} disabled={submitting}>
                <ArrowLeft size={18} aria-hidden="true" /> Back
              </button>
              <button type="submit" className={btnContinue} disabled={submitting}>
                {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {submitting
                  ? 'Working…'
                  : plan.customQuote
                    ? 'Request my quote'
                    : 'Continue to secure checkout'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
