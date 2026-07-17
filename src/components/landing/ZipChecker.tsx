'use client';

import { CheckCircle2, MapPin } from 'lucide-react';
import { useState } from 'react';

export interface ZoneInfo {
  name: string;
  zips: string[];
  days: string; // "Mondays & Thursdays" (pre-formatted server-side)
  fee: string; // "free delivery" / "$2.00 delivery"
}

/** "Do you deliver to my zip?" — instant answer from the zone config. */
export function ZipChecker({ zones }: { zones: ZoneInfo[] }) {
  const [zip, setZip] = useState('');
  const clean = zip.replace(/\D/g, '').slice(0, 5);
  const match = clean.length === 5 ? zones.find((z) => z.zips.includes(clean)) : undefined;
  const checked = clean.length === 5;

  return (
    <div className="rounded-3xl border border-aqua-100 bg-white p-6 shadow-lg shadow-aqua-100/40">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
        <MapPin size={19} className="text-aqua-600" /> Do we deliver to you?
      </h3>
      <input
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        inputMode="numeric"
        maxLength={5}
        placeholder="Enter your zip code"
        aria-label="Zip code"
        className="mt-3 h-14 w-full rounded-2xl border border-aqua-200 bg-white px-5 text-center text-2xl tracking-widest text-navy-900 placeholder:text-base placeholder:tracking-normal placeholder:text-slate-400 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100"
      />
      {checked && match && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-base text-emerald-800">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          <span>
            Yes! That&apos;s our <strong>{match.name.replace(/^Zone \d+ — /, '')}</strong> route —{' '}
            {match.days.toLowerCase()}, {match.fee}.{' '}
            <a href="#signup" className="font-semibold underline underline-offset-2">
              Sign up below
            </a>
            .
          </span>
        </p>
      )}
      {checked && !match && (
        <p className="mt-3 rounded-2xl bg-aqua-50 px-4 py-3 text-base text-navy-900">
          Not on a route yet — but we&apos;re growing.{' '}
          <a href="#signup" className="font-semibold text-aqua-700 underline underline-offset-2">
            Sign up anyway
          </a>{' '}
          and you&apos;ll be first in line when we reach you.
        </p>
      )}
    </div>
  );
}
