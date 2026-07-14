'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * App-wide fallback for routes outside the admin group (portal, login…).
 * Visitors get a professional message — never a stack trace or a plain
 * "Internal Server Error". The digest ties the view to the Vercel log entry.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-4 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle size={22} />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Something went wrong</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sorry — we hit a temporary problem loading this page. Please try again in a moment.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400">
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <button onClick={reset} className="btn-primary mx-auto">
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}
