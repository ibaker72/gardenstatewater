'use client';

import { CheckCircle2, Loader2, MapPin, MessageSquareText } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { checkServiceArea, joinWaitlist } from '@/server/actions/service-area';
import type { PublicAreaCheck } from '@/lib/service-area';
import { serviceAreaCopy } from '@/config/marketing-content';
import { fieldError, fieldLabel, inputBase } from './styles';

type CheckerState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'result'; zip: string; result: PublicAreaCheck }
  | { phase: 'waitlist-sending'; zip: string; result: PublicAreaCheck }
  | { phase: 'waitlist-done'; zip: string }
  | { phase: 'network-error' };

/**
 * The service-area ZIP checker. In-area ZIPs get the 50%-off subscribe CTA;
 * out-of-area visitors become waitlist signups (name + phone + ZIP → the
 * expansion list in Settings → Website).
 */
export function ZipChecker() {
  const [zip, setZip] = useState('');
  const [state, setState] = useState<CheckerState>({ phase: 'idle' });
  const [zipError, setZipError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const zipId = useId();
  const nameId = useId();
  const phoneId = useId();

  async function onCheck(event: FormEvent) {
    event.preventDefault();
    if (state.phase === 'checking') return;
    const clean = zip.trim();
    if (!/^\d{5}$/.test(clean)) {
      setZipError('Enter a 5-digit ZIP code.');
      return;
    }
    setZipError(null);
    setState({ phase: 'checking' });
    try {
      const result = await checkServiceArea(clean);
      setState({ phase: 'result', zip: clean, result });
    } catch {
      setState({ phase: 'network-error' });
    }
  }

  async function onJoinWaitlist(event: FormEvent) {
    event.preventDefault();
    if (state.phase !== 'result' && state.phase !== 'waitlist-sending') return;
    const current = state;
    setWaitlistError(null);
    setState({ phase: 'waitlist-sending', zip: current.zip, result: current.result });
    try {
      const outcome = await joinWaitlist({ name, phone, zip: current.zip, website });
      if (outcome.ok) {
        setState({ phase: 'waitlist-done', zip: current.zip });
      } else {
        setWaitlistError(outcome.message);
        setState({ phase: 'result', zip: current.zip, result: current.result });
      }
    } catch {
      setWaitlistError('We could not save that just now. Please try again in a moment.');
      setState({ phase: 'result', zip: current.zip, result: current.result });
    }
  }

  const showingResult = state.phase === 'result' || state.phase === 'waitlist-sending';

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_18px_50px_-24px_rgba(11,41,69,0.25)] sm:p-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-aqua text-brand-blue">
          <MapPin size={20} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-xl font-bold text-brand-navy sm:text-2xl">
            {serviceAreaCopy.checkerHeading}
          </h3>
          <p className="mt-1 text-[15px] text-brand-ink">{serviceAreaCopy.checkerSupporting}</p>
        </div>
      </div>

      <form onSubmit={onCheck} noValidate className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <label htmlFor={zipId} className={fieldLabel}>
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
          <button
            type="submit"
            disabled={state.phase === 'checking'}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 text-base font-semibold text-white transition-colors hover:bg-brand-bluedark disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:shrink-0"
          >
            {state.phase === 'checking' && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            {state.phase === 'checking' ? 'Checking…' : 'Check availability'}
          </button>
        </div>
        {zipError && (
          <p id={`${zipId}-error`} className={fieldError}>
            {zipError}
          </p>
        )}
      </form>

      <div aria-live="polite">
        {showingResult && state.result.status === 'active' && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-emerald-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-[15px] font-medium text-emerald-800">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Great news! We deliver to{' '}
                <strong>{state.result.town ? `${state.result.town}` : `ZIP ${state.zip}`}</strong>. Your
                first delivery is 50% off.
              </span>
            </p>
            <a
              href={`/signup?zip=${state.zip}`}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              Start My Subscription
            </a>
          </div>
        )}

        {showingResult && state.result.status === 'manual_review' && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl bg-brand-mist px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] font-medium text-brand-navy">
              We’re confirming this neighborhood address by address — start your signup and we’ll
              personally confirm your first delivery.
            </p>
            <a
              href={`/signup?zip=${state.zip}`}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              Start signup
            </a>
          </div>
        )}

        {showingResult && (state.result.status === 'unavailable' || state.result.status === 'upcoming') && (
          <form onSubmit={onJoinWaitlist} noValidate className="mt-5 rounded-xl bg-brand-mist px-4 py-4">
            <p className="flex items-start gap-2 text-[15px] font-medium text-brand-navy">
              <MessageSquareText size={20} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
              <span>
                We’re not in <strong>{state.zip}</strong> yet — join the waitlist and we’ll text you
                when we arrive. The waitlist decides where we expand next.
              </span>
            </p>
            {/* Honeypot — hidden from humans; any value means a bot */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="waitlist-website">Website</label>
              <input
                id="waitlist-website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label htmlFor={nameId} className={fieldLabel}>
                  Name
                </label>
                <input
                  id={nameId}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor={phoneId} className={fieldLabel}>
                  Mobile number
                </label>
                <input
                  id={phoneId}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputBase}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={state.phase === 'waitlist-sending'}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                >
                  {state.phase === 'waitlist-sending' && (
                    <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  )}
                  Join the waitlist
                </button>
              </div>
            </div>
            {waitlistError && <p className={fieldError}>{waitlistError}</p>}
          </form>
        )}

        {state.phase === 'waitlist-done' && (
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-4 text-[15px] font-medium text-emerald-800">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            You’re on the list! We’ll text you the moment our route reaches {state.zip}.
          </p>
        )}

        {state.phase === 'network-error' && (
          <p className="mt-5 rounded-xl bg-amber-50 px-4 py-4 text-[15px] font-medium text-amber-900">
            We couldn’t check availability just now. Please try again in a moment.
          </p>
        )}
      </div>
    </div>
  );
}
