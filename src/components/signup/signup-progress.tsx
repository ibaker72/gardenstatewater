'use client';

import { Check } from 'lucide-react';

const STEPS = ['Location', 'Delivery needs', 'Contact'] as const;

/** Progress rail for the three input steps of the delivery request flow. */
export function SignupProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Request progress">
      {STEPS.map((label, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3;
        const done = stepNumber < current;
        const active = stepNumber === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                done
                  ? 'bg-brand-green text-white'
                  : active
                    ? 'bg-brand-blue text-white'
                    : 'border border-brand-line bg-white text-brand-ink'
              }`}
            >
              {done ? <Check size={16} aria-hidden="true" /> : stepNumber}
            </span>
            <span
              className={`hidden text-sm font-semibold sm:block ${
                active ? 'text-brand-navy' : done ? 'text-brand-green' : 'text-brand-ink'
              }`}
            >
              {label}
            </span>
            {stepNumber < STEPS.length && (
              <span aria-hidden="true" className={`h-px flex-1 ${done ? 'bg-brand-green/50' : 'bg-brand-line'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
