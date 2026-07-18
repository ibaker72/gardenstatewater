import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { siteConfig } from '@/config/site-config';

// The legal pages share the light app shell with the landing page.
const forceLight = `document.documentElement.classList.remove('dark');`;

/** Shared shell for the plain-language legal pages. */
export function LegalPage({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div style={{ colorScheme: 'light' }} className="min-h-screen bg-brand-mist font-sans text-brand-navy">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded text-[15px] font-semibold text-brand-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to homepage
        </a>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-2 text-sm text-brand-ink">
          {siteConfig.businessName} · Last updated {new Date().getFullYear()}
        </p>
        <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-brand-ink [&_p]:max-w-prose">
          {children}
        </div>
      </main>
    </div>
  );
}
