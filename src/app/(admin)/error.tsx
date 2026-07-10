'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Admin-wide error boundary. In production Next.js strips the real message
 * (only a digest survives), and in this app a server exception is almost
 * always the database connection — so say that instead of a blank apology.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-16 max-w-lg px-4">
      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle size={22} />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Something broke server-side</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Nine times out of ten this is the database connection. Check, in order:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <code className="rounded bg-slate-100 px-1 dark:bg-navy-800">DATABASE_URL</code> and{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-navy-800">DIRECT_URL</code> are set where the app
            runs (Vercel → Settings → Environment Variables).
          </li>
          <li>
            On Supabase, use the <strong>pooler</strong> connection strings and note the username is{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-navy-800">postgres.&lt;project-ref&gt;</code> — the
            suffix after the dot is required. Special characters in the password must be URL-encoded.
          </li>
          <li>Redeploy after changing env vars — they don&apos;t apply to existing builds.</li>
          <li>
            Visit <code className="rounded bg-slate-100 px-1 dark:bg-navy-800">/api/health</code> to see the exact
            database error.
          </li>
        </ol>
        {error.digest && (
          <p className="text-xs text-slate-400">
            Error digest: <code>{error.digest}</code> (matches the entry in your Vercel logs)
          </p>
        )}
        <button onClick={reset} className="btn-primary">
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}
