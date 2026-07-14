'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/portal/auth/logout', { method: 'POST' }).catch(() => {});
        router.push('/portal');
      }}
      className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-500 hover:bg-white/70 hover:text-navy-900"
    >
      <LogOut size={15} /> Sign out
    </button>
  );
}
