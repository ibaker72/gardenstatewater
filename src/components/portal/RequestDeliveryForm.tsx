'use client';

import { CalendarPlus, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';

export interface DateOption {
  iso: string; // yyyy-mm-dd
  label: string; // "Thursday" / "Tue, Aug 4"
  sub: string; // "Jul 17"
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-aqua-500 px-4 text-lg font-semibold text-white transition hover:bg-aqua-600 active:scale-[0.99] disabled:opacity-60"
    >
      <CalendarPlus size={20} />
      {pending ? 'Sending…' : 'Request delivery'}
    </button>
  );
}

export function RequestDeliveryForm({
  action,
  dates,
  defaultJugs,
}: {
  action: (form: FormData) => Promise<void>;
  dates: DateOption[];
  defaultJugs: number;
}) {
  const [jugs, setJugs] = useState(Math.min(10, Math.max(1, defaultJugs)));
  const [date, setDate] = useState(dates[0]?.iso ?? '');

  const stepBtn =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-aqua-200 bg-white text-navy-900 transition hover:bg-aqua-50 active:scale-95 disabled:opacity-40';

  return (
    <form action={action} className="space-y-5">
      {/* Jug stepper */}
      <div>
        <div className="mb-2 text-base font-semibold text-navy-900">How many jugs?</div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={stepBtn}
            onClick={() => setJugs((j) => Math.max(1, j - 1))}
            disabled={jugs <= 1}
            aria-label="Fewer jugs"
          >
            <Minus size={22} />
          </button>
          <div className="min-w-16 text-center">
            <div className="text-4xl font-bold tabular-nums text-navy-900">{jugs}</div>
            <div className="text-sm text-slate-500">5-gallon</div>
          </div>
          <button
            type="button"
            className={stepBtn}
            onClick={() => setJugs((j) => Math.min(10, j + 1))}
            disabled={jugs >= 10}
            aria-label="More jugs"
          >
            <Plus size={22} />
          </button>
        </div>
        <input type="hidden" name="jugs" value={jugs} />
      </div>

      {/* Date picker limited to the zone's delivery days */}
      <div>
        <div className="mb-2 text-base font-semibold text-navy-900">Which day?</div>
        {dates.length === 0 ? (
          <p className="text-base text-slate-500">
            No open delivery days right now — add a note below and we&apos;ll figure it out.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {dates.map((d) => (
              <label
                key={d.iso}
                className={`flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border px-3 py-2 text-center transition ${
                  date === d.iso
                    ? 'border-aqua-500 bg-aqua-50 ring-2 ring-aqua-200'
                    : 'border-aqua-200 bg-white hover:bg-aqua-50'
                }`}
              >
                <input
                  type="radio"
                  name="date"
                  value={d.iso}
                  checked={date === d.iso}
                  onChange={() => setDate(d.iso)}
                  className="sr-only"
                />
                <span className="text-base font-semibold capitalize text-navy-900">{d.label}</span>
                {d.sub && <span className="text-sm text-slate-500">{d.sub}</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="mb-2 block text-base font-semibold text-navy-900" htmlFor="notes">
          Anything we should know?
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="e.g. leave them by the side gate"
          className="w-full rounded-2xl border border-aqua-200 bg-white px-5 py-4 text-base text-navy-900 placeholder:text-slate-400 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
