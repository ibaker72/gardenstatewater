'use client';

import { Droplets, KeyRound, MessageSquareText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Step = 'identify' | 'code' | 'pin';

/**
 * Customer sign-in: phone/email → 6-digit texted code, with a 4-digit PIN
 * fallback for customers the owner set one up for. Big type, big buttons,
 * zero jargon — many customers are older and on phones.
 */
export function PortalLogin({ invalidLink = false }: { invalidLink?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    invalidLink ? 'That link didn’t work — it may be old. Sign in below instead.' : null
  );
  const [notice, setNotice] = useState<string | null>(null);

  async function post(path: string, body: Record<string, string>) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError('Please enter your phone number or email.');
      return;
    }
    setBusy(true);
    try {
      await post('/api/portal/auth/request-code', { identifier });
      setNotice('If that matches an account with us, your code is on the way.');
      setCode('');
      setStep('code');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { ok, data } = await post('/api/portal/auth/verify', { identifier, code });
      if (ok && data.next) {
        router.push(data.next);
        return;
      }
      setError(data.error ?? 'Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { ok, data } = await post('/api/portal/auth/pin', { identifier, pin });
      if (ok && data.next) {
        router.push(data.next);
        return;
      }
      setError(data.error ?? 'Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-2xl border border-aqua-200 bg-white px-5 text-lg text-navy-900 placeholder:text-slate-400 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100 h-14';
  const primaryBtn =
    'flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-aqua-500 text-lg font-semibold text-white transition active:scale-[0.99] hover:bg-aqua-600 disabled:opacity-60';
  const linkBtn = 'text-aqua-700 underline-offset-2 hover:underline font-medium';

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-aqua-50 via-white to-white px-5 py-10">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-aqua-500 shadow-lg shadow-aqua-200">
            <Droplets size={34} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-navy-900">Garden State Water</h1>
          <p className="mt-1 text-base text-slate-500">Your water, delivered.</p>
        </div>

        <div className="rounded-3xl border border-aqua-100 bg-white p-6 shadow-xl shadow-aqua-100/50">
          {step === 'identify' && (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">Sign in to your account</h2>
                <p className="mt-1 text-base text-slate-500">
                  Enter the phone number or email we have on file and we&apos;ll text you a code.
                </p>
              </div>
              <input
                className={input}
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="Phone number or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-label="Phone number or email"
              />
              {error && <p className="text-base font-medium text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className={primaryBtn}>
                <MessageSquareText size={20} />
                {busy ? 'Sending…' : 'Send my code'}
              </button>
              <p className="pt-1 text-center text-base text-slate-500">
                Have a 4-digit PIN from us?{' '}
                <button type="button" className={linkBtn} onClick={() => { setError(null); setStep('pin'); }}>
                  Sign in with PIN
                </button>
              </p>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">Enter your code</h2>
                <p className="mt-1 text-base text-slate-500">{notice}</p>
              </div>
              <input
                className={`${input} text-center text-2xl tracking-[0.5em]`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                aria-label="6-digit code"
                autoFocus
              />
              {error && <p className="text-base font-medium text-red-600">{error}</p>}
              <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
                {busy ? 'Checking…' : 'Sign in'}
              </button>
              <div className="flex items-center justify-between pt-1 text-base">
                <button type="button" className={linkBtn} onClick={() => sendCode()} disabled={busy}>
                  Send a new code
                </button>
                <button
                  type="button"
                  className="text-slate-500 hover:underline"
                  onClick={() => { setError(null); setNotice(null); setStep('identify'); }}
                >
                  Start over
                </button>
              </div>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={verifyPin} className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">Sign in with your PIN</h2>
                <p className="mt-1 text-base text-slate-500">
                  Use the 4-digit PIN we set up for you, plus your phone number or email.
                </p>
              </div>
              <input
                className={input}
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="Phone number or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-label="Phone number or email"
              />
              <input
                className={`${input} text-center text-2xl tracking-[0.5em]`}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                pattern="\d{4}"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                aria-label="4-digit PIN"
              />
              {error && <p className="text-base font-medium text-red-600">{error}</p>}
              <button type="submit" disabled={busy || pin.length !== 4} className={primaryBtn}>
                <KeyRound size={20} />
                {busy ? 'Checking…' : 'Sign in'}
              </button>
              <p className="pt-1 text-center text-base text-slate-500">
                <button type="button" className={linkBtn} onClick={() => { setError(null); setStep('identify'); }}>
                  Text me a code instead
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-base text-slate-400">
          Need help? Reply to any of our texts and we&apos;ll get you sorted.
        </p>
      </main>
    </div>
  );
}
