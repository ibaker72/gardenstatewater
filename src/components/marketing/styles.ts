/**
 * Shared class recipes for the marketing site, so buttons and containers stay
 * identical across sections without a component-library dependency.
 */

export const container = 'mx-auto w-full max-w-site px-5 sm:px-8';

export const btnBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export const btnPrimary = `${btnBase} bg-brand-blue text-white hover:bg-brand-bluedark focus-visible:outline-brand-navy`;

export const btnSecondary = `${btnBase} border border-brand-line bg-white text-brand-navy hover:border-brand-blue hover:bg-brand-mist focus-visible:outline-brand-blue`;

export const btnOnDark = `${btnBase} bg-white text-brand-navy hover:bg-brand-aqua focus-visible:outline-white`;

export const btnGhostOnDark = `${btnBase} border border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/10 focus-visible:outline-white`;

export const sectionEyebrow =
  'text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue';

export const sectionHeading = 'mt-2 text-3xl font-bold tracking-tight text-brand-navy md:text-4xl';

export const inputBase =
  'h-12 w-full rounded-xl border border-brand-line bg-white px-4 text-base text-brand-navy placeholder:text-brand-ink/60 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30';

export const fieldLabel = 'mb-1.5 block text-sm font-semibold text-brand-navy';

export const fieldError = 'mt-1.5 text-sm font-medium text-red-600';
