'use client';

import { CheckCircle2, CircleAlert, Loader2, MapPin } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { checkServiceArea } from '@/server/actions/service-area';
import type { ServiceAreaStatus } from '@/lib/service-area';
import type { CustomerType } from '@/lib/validation/delivery-request';
import { scrollToSection, useLandingFlow } from './landing-context';
import { fieldError } from './styles';

const RESULT_COPY: Record<ServiceAreaStatus, { tone: 'good' | 'info'; message: string; cta: string }> = {
  active: {
    tone: 'good',
    message: 'Great news — we currently serve your area.',
    cta: 'Start my request',
  },
  upcoming: {
    tone: 'info',
    message:
      'Your area is on our upcoming route list. Join the priority list and we’ll contact you as service expands.',
    cta: 'Join the priority list',
  },
  unavailable: {
    tone: 'info',
    message:
      'We do not currently have an active route in this ZIP code, but you can join the expansion list.',
    cta: 'Join the expansion list',
  },
  manual_review: {
    tone: 'info',
    message:
      'We’re building our first North Jersey routes now. Submit your address and we’ll personally confirm availability.',
    cta: 'Submit my address',
  },
};

type CheckerState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'result'; status: ServiceAreaStatus }
  | { phase: 'network-error' };

/**
 * The prominent ZIP availability checker under the hero. The result (and the
 * chosen ZIP + customer type) carries into the delivery request flow so the
 * visitor never re-types it.
 */
export function AvailabilityChecker() {
  const { mergePrefill } = useLandingFlow();
  const [zip, setZip] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('home');
  const [state, setState] = useState<CheckerState>({ phase: 'idle' });
  const [zipError, setZipError] = useState<string | null>(null);
  const zipId = useId();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (state.phase === 'loading') return;

    const clean = zip.trim();
    if (!/^\d{5}$/.test(clean)) {
      setZipError('Enter a 5-digit ZIP code.');
      return;
    }
    setZipError(null);
    setState({ phase: 'loading' });
    try {
      const result = await checkServiceArea(clean);
      setState({ phase: 'result', status: result.status });
      mergePrefill({ zip: clean, customerType, serviceAreaStatus: result.status });
    } catch {
      setState({ phase: 'network-error' });
    }
  }

  const result = state.phase === 'result' ? RESULT_COPY[state.status] : null;

  return (
    <section id="availability" aria-labelledby="availability-heading" className="scroll-mt-24 bg-brand-mist pb-16 md:pb-20">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_18px_50px_-24px_rgba(11,41,69,0.25)] sm:p-8 md:-mt-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-aqua text-brand-blue">
              <MapPin size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 id="availability-heading" className="text-xl font-bold text-brand-navy sm:text-2xl">
                Do we deliver to your neighborhood?
              </h2>
              <p className="mt-1 text-[15px] text-brand-ink">
                Enter your ZIP code to see whether your address is on an active or upcoming route.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:w-40">
                <label htmlFor={zipId} className="mb-1.5 block text-sm font-semibold text-brand-navy">
                  ZIP code
                </label>
                <input
                  id={zipId}
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value.replace(/\D/g, '').slice(0, 5));
                    if (zipError) setZipError(null);
                  }}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={5}
                  aria-invalid={zipError ? true : undefined}
                  aria-describedby={zipError ? `${zipId}-error` : undefined}
                  className="h-12 w-full rounded-xl border border-brand-line bg-white px-4 text-center text-lg font-semibold tracking-[0.2em] text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              <fieldset className="sm:flex-1">
                <legend className="mb-1.5 block text-sm font-semibold text-brand-navy">
                  Delivery for
                </legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Customer type">
                  {(['home', 'business'] as const).map((type) => (
                    <label
                      key={type}
                      className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border text-[15px] font-semibold transition-colors ${
                        customerType === type
                          ? 'border-brand-blue bg-brand-aqua text-brand-navy'
                          : 'border-brand-line bg-white text-brand-ink hover:border-brand-blue/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="checker-customer-type"
                        value={type}
                        checked={customerType === type}
                        onChange={() => setCustomerType(type)}
                        className="sr-only"
                      />
                      {type === 'home' ? 'Home' : 'Business'}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={state.phase === 'loading'}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 text-base font-semibold text-white transition-colors hover:bg-brand-bluedark disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:shrink-0"
              >
                {state.phase === 'loading' && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {state.phase === 'loading' ? 'Checking…' : 'Check Availability'}
              </button>
            </div>
            {zipError && (
              <p id={`${zipId}-error`} className={fieldError}>
                {zipError}
              </p>
            )}
          </form>

          <div aria-live="polite">
            {result && (
              <div
                className={`mt-5 flex flex-col gap-3 rounded-xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  result.tone === 'good' ? 'bg-emerald-50' : 'bg-brand-mist'
                }`}
              >
                <p className={`flex items-start gap-2 text-[15px] font-medium ${result.tone === 'good' ? 'text-emerald-800' : 'text-brand-navy'}`}>
                  {result.tone === 'good' ? (
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <CircleAlert size={20} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
                  )}
                  <span>{result.message}</span>
                </p>
                <button
                  type="button"
                  onClick={() => scrollToSection('request-service')}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                >
                  {result.cta}
                </button>
              </div>
            )}
            {state.phase === 'network-error' && (
              <p className="mt-5 rounded-xl bg-amber-50 px-4 py-4 text-[15px] font-medium text-amber-900">
                We couldn’t check availability just now. You can still request service below and
                we’ll confirm your address personally.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
