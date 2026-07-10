'use client';

import { Droplets } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthCheck {
  configured: boolean;
  ownerEmailSet: boolean;
  authenticated: boolean;
  email: string | null;
  isOwner: boolean;
}

function deniedMessage(email: string, ownerEmailSet: boolean) {
  return ownerEmailSet
    ? `You're signed in as ${email}, but the server's OWNER_EMAIL is set to a different address. Update OWNER_EMAIL to exactly "${email}" in your environment (.env locally, or Vercel → Settings → Environment Variables), then restart the dev server or redeploy.`
    : `You're signed in as ${email}, but OWNER_EMAIL isn't set on the server, so nobody is allowed into the admin app. Add OWNER_EMAIL=${email} to your environment (.env locally, or Vercel → Settings → Environment Variables), then restart the dev server or redeploy.`;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Middleware bounces authenticated non-owners here with ?denied=<email>.
  const denied = params.get('denied');
  const [error, setError] = useState<string | null>(
    denied ? deniedMessage(denied, params.get('reason') !== 'owner-unset') : null
  );

  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!supabase) {
        // No NEXT_PUBLIC_SUPABASE_* in the browser bundle. Either true dev
        // mode (server has none either → middleware is open) or the vars were
        // added after the last build — ask the server which it is.
        const check: AuthCheck = await (await fetch('/api/auth/check')).json();
        if (check.configured) {
          setError(
            'The server has Supabase configured, but the browser bundle is missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. These are baked in at build time — restart the dev server (or redeploy on Vercel) after adding them.'
          );
          return;
        }
        router.push(params.get('next') ?? '/');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Signed in — but the admin app only admits the OWNER_EMAIL account.
      const check: AuthCheck = await (await fetch('/api/auth/check')).json();
      if (check.isOwner) {
        router.push(params.get('next') ?? '/');
        router.refresh();
        return;
      }
      setError(deniedMessage(check.email ?? email, check.ownerEmailSet));
      // Drop the useless session so retrying is clean.
      await supabase.auth.signOut();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Droplets className="text-aqua-500" size={28} />
        <div>
          <div className="font-bold leading-tight">Garden State Water</div>
          <div className="text-xs text-slate-500">Owner sign-in</div>
        </div>
      </div>
      {!supabase && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Supabase isn&apos;t configured in this build — press sign in to continue in open dev mode.
        </p>
      )}
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-navy-950 to-navy-800 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
