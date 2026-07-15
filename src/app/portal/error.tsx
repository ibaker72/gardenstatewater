'use client';

import { RefreshCw } from 'lucide-react';

/**
 * Portal-wide error fallback in the portal's light design language.
 * Customers never see stack traces or a plain "Internal Server Error".
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-aqua-50 via-white to-white px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-aqua-100 bg-white p-6 text-center shadow-xl shadow-aqua-100/50">
        <div className="text-4xl">💧</div>
        <h1 className="mt-3 text-2xl font-bold text-navy-900">Something went wrong</h1>
        <p className="mt-2 text-base text-slate-500">
          Sorry about that — a quick retry usually fixes it. If it keeps happening, reply to any of
          our texts and we&apos;ll sort it out.
        </p>
        {error.digest && <p className="mt-2 text-sm text-slate-400">Reference: {error.digest}</p>}
        <button
          onClick={reset}
          className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-aqua-500 px-4 text-lg font-semibold text-white transition hover:bg-aqua-600 active:scale-[0.99]"
        >
          <RefreshCw size={20} /> Try again
        </button>
      </div>
    </div>
  );
}
