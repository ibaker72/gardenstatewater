'use client';

/** Pill-style radio group used across the flow's choice questions. */
export function OptionCards<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  columns = 3,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  columns?: 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-semibold text-brand-navy">{legend}</legend>
      <div className={`grid gap-2 ${columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[15px] font-medium transition-colors ${
                selected
                  ? 'border-brand-blue bg-brand-aqua text-brand-navy'
                  : 'border-brand-line bg-white text-brand-ink hover:border-brand-blue/50'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-red-600">{error}</p>}
    </fieldset>
  );
}
