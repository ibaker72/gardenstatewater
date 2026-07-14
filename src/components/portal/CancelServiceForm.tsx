'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-base font-semibold text-white transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? 'Sending…' : 'Yes, cancel my service'}
    </button>
  );
}

/** Two-step cancel: the scary button only appears after an explicit first tap. */
export function CancelServiceForm({ action }: { action: (form: FormData) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-base font-semibold text-red-600 transition hover:bg-red-50 active:scale-[0.99]"
      >
        Cancel my service
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-base text-red-800">
        <AlertTriangle size={20} className="mt-0.5 shrink-0" />
        We&apos;d hate to see you go. This tells us to stop your deliveries and close your account —
        we&apos;ll reach out to confirm and pick up any jugs.
      </p>
      <textarea
        name="reason"
        rows={2}
        maxLength={300}
        placeholder="Mind telling us why? (optional)"
        className="w-full rounded-2xl border border-red-200 bg-white px-5 py-4 text-base text-navy-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-4 focus:ring-red-100"
      />
      <ConfirmButton />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="flex min-h-11 w-full items-center justify-center rounded-2xl text-base font-medium text-slate-500 hover:bg-slate-50"
      >
        Never mind — keep my service
      </button>
    </form>
  );
}
