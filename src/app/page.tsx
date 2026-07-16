import type { Metadata } from 'next';
import { CalendarCheck, CheckCircle2, Droplets, MapPin, Phone, Truck } from 'lucide-react';
import { getConfig } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { money, WEEKDAYS } from '@/lib/format';
import { submitSignup } from '@/server/actions/signup';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Garden State Water — 5-gallon water delivery in North Jersey',
  description:
    'Fresh 5-gallon water jugs delivered to your door or business. Weekly and bi-weekly plans, easy online payment, no contracts.',
};

const card = 'rounded-3xl border border-aqua-100 bg-white p-6 shadow-lg shadow-aqua-100/40';
const input =
  'h-14 w-full rounded-2xl border border-aqua-200 bg-white px-5 text-base text-navy-900 placeholder:text-slate-400 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100';
const btnPrimary =
  'flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-aqua-500 px-6 text-lg font-semibold text-white transition hover:bg-aqua-600 active:scale-[0.99]';
const btnGhost =
  'flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-aqua-200 bg-white px-6 text-lg font-semibold text-navy-900 transition hover:bg-aqua-50 active:scale-[0.99]';

// Force light mode — this page shares the app shell with the dark admin.
const forceLight = `document.documentElement.classList.remove('dark');`;

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string }>;
}) {
  const { signup } = await searchParams;
  const [config, zones] = await Promise.all([
    getConfig(),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div style={{ colorScheme: 'light' }} className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />

      {/* Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aqua-500 shadow-md shadow-aqua-200">
            <Droplets size={24} className="text-white" />
          </div>
          <div className="font-bold leading-tight text-navy-900">
            Garden State Water
            <div className="text-xs font-normal text-slate-500">Water delivery · New Jersey</div>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <a href="/portal" className="flex min-h-11 items-center rounded-xl px-3 text-base font-semibold text-aqua-700 hover:bg-white/70">
            Customer portal
          </a>
          <a href="/login" className="hidden min-h-11 items-center rounded-xl px-3 text-sm text-slate-400 hover:text-navy-900 sm:flex">
            Owner sign in
          </a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-16">
        {signup === '1' && (
          <p className="mb-6 rounded-2xl bg-emerald-50 px-5 py-4 text-lg font-medium text-emerald-800">
            🎉 You&apos;re in! We got your signup and we&apos;ll reach out today to set up your first delivery.
          </p>
        )}
        {signup === 'error' && (
          <p className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-base font-medium text-red-700">
            We need at least your name, address, and a phone number or email — mind trying again below?
          </p>
        )}

        {/* Hero */}
        <section className="py-10 text-center md:py-16">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-navy-900 md:text-5xl">
            Fresh 5-gallon water, delivered to your door.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xl text-slate-500">
            Home and business delivery across North Jersey. No contracts, no hauling jugs from the
            store — we bring them, you leave the empties out.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <a href="#signup" className={btnPrimary}>
              Get started — {money(config.jugRefillPrice)}/jug
            </a>
            <a href="/portal" className={btnGhost}>
              I&apos;m already a customer
            </a>
          </div>
        </section>

        {/* How it works */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: CalendarCheck, title: 'Pick your plan', text: 'Weekly, bi-weekly, monthly, or just when you need it. Change or pause anytime.' },
            { icon: Truck, title: 'We deliver', text: 'Full jugs to your door on your day. Leave the empties out and we swap them.' },
            { icon: CheckCircle2, title: 'Pay your way', text: 'Card online, cash, Venmo, CashApp, or Zelle — whatever is easiest for you.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className={card}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aqua-100 text-aqua-700">
                <Icon size={24} />
              </div>
              <h2 className="mt-3 text-lg font-semibold text-navy-900">{title}</h2>
              <p className="mt-1 text-base text-slate-500">{text}</p>
            </div>
          ))}
        </section>

        {/* Pricing */}
        <section className="mt-12">
          <h2 className="text-center text-3xl font-bold text-navy-900">Simple pricing</h2>
          <p className="mt-2 text-center text-lg text-slate-500">No contracts. No delivery windows that eat your whole day.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className={card}>
              <div className="text-4xl font-bold text-navy-900">{money(config.jugRefillPrice)}</div>
              <div className="mt-1 text-lg font-semibold text-navy-900">5-gallon refill</div>
              <p className="mt-1 text-base text-slate-500">
                Swap your empties for full jugs. Buy {config.bulkBuyQty}, get {config.bulkFreeQty} free.
              </p>
            </div>
            <div className={`${card} border-aqua-300 ring-2 ring-aqua-200`}>
              <div className="text-4xl font-bold text-navy-900">{config.weeklyDiscountPct}% off</div>
              <div className="mt-1 text-lg font-semibold text-navy-900">Weekly plan</div>
              <p className="mt-1 text-base text-slate-500">
                Our best deal — every refill, every week. Bi-weekly saves {config.biweeklyDiscountPct}%.
              </p>
            </div>
            <div className={card}>
              <div className="text-4xl font-bold text-navy-900">{money(config.dispenserRentalPrice)}<span className="text-lg font-medium text-slate-400">/mo</span></div>
              <div className="mt-1 text-lg font-semibold text-navy-900">Dispenser rental</div>
              <p className="mt-1 text-base text-slate-500">
                Hot &amp; cold countertop dispenser. First jug{' '}
                {money(config.jugPurchasePrice)} if you need your own bottles.
              </p>
            </div>
          </div>
        </section>

        {/* Service areas */}
        {zones.length > 0 && (
          <section className="mt-12">
            <h2 className="text-center text-3xl font-bold text-navy-900">Where we deliver</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {zones.map((z) => (
                <div key={z.id} className={card}>
                  <div className="flex items-center gap-2 text-navy-900">
                    <MapPin size={18} className="text-aqua-600" />
                    <span className="text-lg font-semibold">{z.name.replace(/^Zone \d+ — /, '')}</span>
                  </div>
                  <p className="mt-1 text-base text-slate-500">
                    {z.deliveryDays.length > 0
                      ? `${z.deliveryDays.map((d) => WEEKDAYS[d] + 's').join(' & ')}`
                      : 'Flexible days'}
                    {' · '}
                    {z.deliveryFee > 0 ? `${money(z.deliveryFee)} delivery` : 'free delivery'}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-base text-slate-400">
              Not in one of these areas? Sign up anyway and we&apos;ll let you know when we reach you.
            </p>
          </section>
        )}

        {/* Signup */}
        <section id="signup" className="mt-12">
          <div className={`${card} mx-auto max-w-2xl`}>
            <h2 className="text-2xl font-bold text-navy-900">Start your delivery</h2>
            <p className="mt-1 text-base text-slate-500">
              Tell us where to bring the water — we&apos;ll confirm your first delivery today.
            </p>
            <form action={submitSignup} className="mt-5 space-y-3">
              {/* Honeypot — humans never see or fill this */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              <input name="name" required className={input} placeholder="Your name *" aria-label="Your name" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="phone" type="tel" inputMode="tel" className={input} placeholder="Phone" aria-label="Phone" />
                <input name="email" type="email" className={input} placeholder="Email" aria-label="Email" />
              </div>
              <input name="address" required className={input} placeholder="Street address *" aria-label="Street address" />
              <div className="grid grid-cols-2 gap-3">
                <input name="city" className={input} placeholder="City" aria-label="City" />
                <input name="zip" inputMode="numeric" className={input} placeholder="Zip" aria-label="Zip" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select name="plan" defaultValue="WEEKLY" className={input} aria-label="Delivery plan">
                  <option value="WEEKLY">Weekly ({config.weeklyDiscountPct}% off)</option>
                  <option value="BIWEEKLY">Bi-weekly ({config.biweeklyDiscountPct}% off)</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="ON_DEMAND">Just when I ask</option>
                </select>
                <select name="jugs" defaultValue="2" className={input} aria-label="Jugs per delivery">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} jug{n === 1 ? '' : 's'} / delivery
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="message"
                rows={2}
                maxLength={400}
                className="w-full rounded-2xl border border-aqua-200 bg-white px-5 py-4 text-base text-navy-900 placeholder:text-slate-400 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100"
                placeholder="Anything we should know? (gate codes, business hours…)"
                aria-label="Notes"
              />
              <button type="submit" className={`${btnPrimary} w-full`}>
                <Droplets size={20} /> Sign me up
              </button>
              <p className="text-center text-sm text-slate-400">
                No payment needed now — we confirm everything with you first.
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-aqua-100 bg-white/60 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-5 text-center text-base text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-navy-900">
            <Droplets size={18} className="text-aqua-600" /> {config.businessName}
          </div>
          {config.businessPhone && (
            <a href={`tel:${config.businessPhone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 hover:text-navy-900">
              <Phone size={15} /> {config.businessPhone}
            </a>
          )}
          {config.businessEmail && <a href={`mailto:${config.businessEmail}`} className="hover:text-navy-900">{config.businessEmail}</a>}
          <div className="mt-1 flex gap-4 text-sm text-slate-400">
            <a href="/portal" className="hover:text-navy-900">Customer portal</a>
            <a href="/login" className="hover:text-navy-900">Owner sign in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
