'use client';

import { Droplets, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/config/site-config';

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * Sticky marketing header. Desktop: inline nav + customer login + primary CTA.
 * Mobile: accessible slide-down menu (focus trapped, Escape closes, background
 * scroll locked, closes on link click).
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    document.body.style.overflow = 'hidden';
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-site items-center justify-between gap-2 px-5 py-3.5 sm:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue">
            <Droplets size={22} className="text-white" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block whitespace-nowrap font-bold text-brand-navy">{siteConfig.businessName}</span>
            <span className="block whitespace-nowrap text-xs text-brand-ink">North Jersey water delivery</span>
          </span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
          {siteConfig.navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-brand-ink transition-colors hover:bg-brand-mist hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <a
            href={siteConfig.customerPortalPath}
            className="whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            Customer Login
          </a>
          <a
            href="#availability"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-bluedark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            Check Availability
          </a>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-line text-brand-navy hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue xl:hidden"
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="border-t border-brand-line bg-white xl:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col px-5 py-3">
            {siteConfig.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-lg px-3 py-3 text-base font-medium text-brand-navy hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-brand-line pt-3">
              <a
                href={siteConfig.customerPortalPath}
                onClick={close}
                className="rounded-xl border border-brand-line px-4 py-3 text-center text-base font-semibold text-brand-navy hover:bg-brand-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
              >
                Customer Login
              </a>
              <a
                href="#availability"
                onClick={close}
                className="rounded-xl bg-brand-blue px-4 py-3 text-center text-base font-semibold text-white hover:bg-brand-bluedark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
              >
                Check Availability
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
