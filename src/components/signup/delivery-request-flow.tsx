'use client';

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { consentCopy } from '@/config/marketing-content';
import { siteConfig } from '@/config/site-config';
import {
  contactStepSchema,
  DISPENSER_LABELS,
  dispenserChoices,
  FREQUENCY_LABELS,
  frequencies,
  QUANTITY_LABELS,
  quantities,
  ZIP_RE,
  type CustomerType,
  type DispenserChoice,
  type Frequency,
  type Quantity,
} from '@/lib/validation/delivery-request';
import { submitDeliveryRequest } from '@/server/actions/delivery-request';
import { useLandingFlow } from '@/components/marketing/landing-context';
import { container, fieldError, fieldLabel, inputBase, sectionEyebrow, sectionHeading } from '@/components/marketing/styles';
import { SignupProgress } from './signup-progress';
import { OptionCards } from './option-cards';

type Step = 1 | 2 | 3 | 4;

interface FormState {
  zip: string;
  customerType: CustomerType;
  frequency: Frequency | null;
  quantity: Quantity | null;
  dispenser: DispenserChoice | null;
  fullName: string;
  phone: string;
  email: string;
  streetAddress: string;
  addressLine2: string;
  city: string;
  deliveryNotes: string;
  website: string; // honeypot
}

const INITIAL: FormState = {
  zip: '',
  customerType: 'home',
  frequency: null,
  quantity: null,
  dispenser: null,
  fullName: '',
  phone: '',
  email: '',
  streetAddress: '',
  addressLine2: '',
  city: '',
  deliveryNotes: '',
  website: '',
};

const btnContinue =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-blue px-7 text-base font-semibold text-white transition-colors hover:bg-brand-bluedark disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy';
const btnBack =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand-line bg-white px-5 text-base font-semibold text-brand-navy transition-colors hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue';

/**
 * The multi-step delivery request. Values checked in the availability checker
 * arrive via the landing context, so the visitor never re-types their ZIP.
 * Client-side validation mirrors the server's Zod schema; the server remains
 * the source of truth.
 */
export function DeliveryRequestFlow() {
  const { prefill } = useLandingFlow();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The checker sits above this flow, so a fresh check simply prefills here.
  useEffect(() => {
    setForm((current) => ({
      ...current,
      zip: prefill.zip ?? current.zip,
      customerType: prefill.customerType ?? current.customerType,
    }));
  }, [prefill]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  function continueFromLocation() {
    if (!ZIP_RE.test(form.zip.trim())) {
      setErrors({ zip: 'Enter a 5-digit ZIP code.' });
      return;
    }
    setErrors({});
    setStep(2);
  }

  function continueFromNeeds() {
    const missing: Partial<Record<string, string>> = {};
    if (!form.frequency) missing.frequency = 'Choose a delivery frequency.';
    if (!form.quantity) missing.quantity = 'Choose an estimated bottle quantity.';
    if (!form.dispenser) missing.dispenser = 'Choose a dispenser option.';
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return;
    }
    setErrors({});
    setStep(3);
  }

  async function submit() {
    if (submitting) return;
    const parsed = contactStepSchema.safeParse({
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      streetAddress: form.streetAddress,
      addressLine2: form.addressLine2,
      city: form.city,
      deliveryNotes: form.deliveryNotes,
    });
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
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await submitDeliveryRequest({
        zip: form.zip.trim(),
        customerType: form.customerType,
        frequency: form.frequency ?? 'NOT_SURE',
        quantity: form.quantity ?? 'NOT_SURE',
        dispenser: form.dispenser ?? 'NONE',
        contact: parsed.data,
        serviceAreaStatus: prefill.serviceAreaStatus ?? null,
        website: form.website,
      });
      if (result.ok) {
        setStep(4);
      } else {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError('We could not send your request just now. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="request-service" aria-labelledby="request-heading" className="scroll-mt-24 bg-brand-mist py-16 md:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className={sectionEyebrow}>Request service</p>
            <h2 id="request-heading" className={sectionHeading}>
              Tell us what you need — we confirm the rest.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-brand-ink">
              No payment now. We verify your address, availability, pricing, bottle setup, and first
              delivery date before anything is charged.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-brand-line bg-white p-6 shadow-[0_18px_50px_-24px_rgba(11,41,69,0.2)] sm:p-8">
            {step !== 4 && <SignupProgress current={step} />}

            {step === 1 && (
              <form
                className="mt-7 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  continueFromLocation();
                }}
                noValidate
              >
                <div className="max-w-[12rem]">
                  <label htmlFor="flow-zip" className={fieldLabel}>
                    ZIP code
                  </label>
                  <input
                    id="flow-zip"
                    value={form.zip}
                    onChange={(e) => set('zip', e.target.value.replace(/\D/g, '').slice(0, 5))}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    aria-invalid={errors.zip ? true : undefined}
                    aria-describedby={errors.zip ? 'flow-zip-error' : undefined}
                    className={inputBase}
                  />
                  {errors.zip && (
                    <p id="flow-zip-error" className={fieldError}>
                      {errors.zip}
                    </p>
                  )}
                </div>
                <OptionCards
                  legend="This delivery is for a…"
                  name="flow-customer-type"
                  columns={2}
                  options={[
                    { value: 'home', label: 'Home' },
                    { value: 'business', label: 'Business' },
                  ]}
                  value={form.customerType}
                  onChange={(v) => set('customerType', v)}
                />
                <div className="flex justify-end">
                  <button type="submit" className={btnContinue}>
                    Continue <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form
                className="mt-7 space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  continueFromNeeds();
                }}
                noValidate
              >
                <OptionCards
                  legend="Delivery frequency"
                  name="flow-frequency"
                  options={frequencies.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }))}
                  value={form.frequency}
                  onChange={(v) => set('frequency', v)}
                  error={errors.frequency}
                />
                <OptionCards
                  legend="Estimated bottles per delivery"
                  name="flow-quantity"
                  options={quantities.map((q) => ({ value: q, label: QUANTITY_LABELS[q] }))}
                  value={form.quantity}
                  onChange={(v) => set('quantity', v)}
                  error={errors.quantity}
                />
                <OptionCards
                  legend="Dispenser"
                  name="flow-dispenser"
                  options={dispenserChoices.map((d) => ({ value: d, label: DISPENSER_LABELS[d] }))}
                  value={form.dispenser}
                  onChange={(v) => set('dispenser', v)}
                  error={errors.dispenser}
                />
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

            {step === 3 && (
              <form
                className="mt-7 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                noValidate
              >
                {/* Honeypot — visually hidden, never announced, ignored by humans */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="flow-website">Website</label>
                  <input
                    id="flow-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => set('website', e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="flow-name" className={fieldLabel}>
                    Full name
                  </label>
                  <input
                    id="flow-name"
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                    autoComplete="name"
                    aria-invalid={errors.fullName ? true : undefined}
                    aria-describedby={errors.fullName ? 'flow-name-error' : undefined}
                    className={inputBase}
                  />
                  {errors.fullName && (
                    <p id="flow-name-error" className={fieldError}>
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="flow-phone" className={fieldLabel}>
                      Phone
                    </label>
                    <input
                      id="flow-phone"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      aria-invalid={errors.phone ? true : undefined}
                      aria-describedby={errors.phone ? 'flow-phone-error' : undefined}
                      className={inputBase}
                    />
                    {errors.phone && (
                      <p id="flow-phone-error" className={fieldError}>
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="flow-email" className={fieldLabel}>
                      Email
                    </label>
                    <input
                      id="flow-email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      type="email"
                      autoComplete="email"
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? 'flow-email-error' : undefined}
                      className={inputBase}
                    />
                    {errors.email && (
                      <p id="flow-email-error" className={fieldError}>
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-brand-ink">
                  Add a phone number, an email, or both — we need at least one way to reach you.
                </p>

                <div>
                  <label htmlFor="flow-street" className={fieldLabel}>
                    Street address
                  </label>
                  <input
                    id="flow-street"
                    value={form.streetAddress}
                    onChange={(e) => set('streetAddress', e.target.value)}
                    autoComplete="address-line1"
                    aria-invalid={errors.streetAddress ? true : undefined}
                    aria-describedby={errors.streetAddress ? 'flow-street-error' : undefined}
                    className={inputBase}
                  />
                  {errors.streetAddress && (
                    <p id="flow-street-error" className={fieldError}>
                      {errors.streetAddress}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
                  <div>
                    <label htmlFor="flow-line2" className={fieldLabel}>
                      Apt / suite <span className="font-normal text-brand-ink">(optional)</span>
                    </label>
                    <input
                      id="flow-line2"
                      value={form.addressLine2}
                      onChange={(e) => set('addressLine2', e.target.value)}
                      autoComplete="address-line2"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label htmlFor="flow-city" className={fieldLabel}>
                      City
                    </label>
                    <input
                      id="flow-city"
                      value={form.city}
                      onChange={(e) => set('city', e.target.value)}
                      autoComplete="address-level2"
                      aria-invalid={errors.city ? true : undefined}
                      aria-describedby={errors.city ? 'flow-city-error' : undefined}
                      className={inputBase}
                    />
                    {errors.city && (
                      <p id="flow-city-error" className={fieldError}>
                        {errors.city}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="flow-zip-confirm" className={fieldLabel}>
                      ZIP
                    </label>
                    <input
                      id="flow-zip-confirm"
                      value={form.zip}
                      onChange={(e) => set('zip', e.target.value.replace(/\D/g, '').slice(0, 5))}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="flow-notes" className={fieldLabel}>
                    Delivery notes <span className="font-normal text-brand-ink">(optional)</span>
                  </label>
                  <textarea
                    id="flow-notes"
                    value={form.deliveryNotes}
                    onChange={(e) => set('deliveryNotes', e.target.value)}
                    rows={2}
                    maxLength={400}
                    placeholder="Gate codes, building access, preferred drop-off spot…"
                    className="w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-base text-brand-navy placeholder:text-brand-ink/60 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
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
                    {submitting ? 'Sending…' : 'Submit request'}
                  </button>
                </div>
              </form>
            )}

            {step === 4 && (
              <div className="py-4 text-center" aria-live="polite">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-brand-green">
                  <CheckCircle2 size={30} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-2xl font-bold text-brand-navy">Request received.</h3>
                <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-brand-ink">
                  We’ll verify your address, route availability, pricing, bottle setup, and first
                  available delivery date before anything is charged.
                </p>
                <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-brand-line bg-brand-mist p-5 text-left text-[15px]">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Type</dt>
                    <dd className="font-semibold text-brand-navy">
                      {form.customerType === 'business' ? 'Business' : 'Home'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">ZIP code</dt>
                    <dd className="font-semibold text-brand-navy">{form.zip}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Frequency</dt>
                    <dd className="font-semibold text-brand-navy">
                      {form.frequency ? FREQUENCY_LABELS[form.frequency] : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Bottles</dt>
                    <dd className="font-semibold text-brand-navy">
                      {form.quantity ? QUANTITY_LABELS[form.quantity] : '—'}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Dispenser</dt>
                    <dd className="font-semibold text-brand-navy">
                      {form.dispenser ? DISPENSER_LABELS[form.dispenser] : '—'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <a
                    href="#top"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-blue px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-bluedark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                  >
                    Return to homepage
                  </a>
                  <a
                    href={siteConfig.customerPortalPath}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-line bg-white px-6 py-3 text-base font-semibold text-brand-navy transition-colors hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                  >
                    Customer login
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
