import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CalendarCheck, CheckCircle2, Droplets, Phone, Quote, Truck } from 'lucide-react';
import { getConfig } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { money, WEEKDAYS } from '@/lib/format';
import { submitSignup } from '@/server/actions/signup';
import { ZipChecker, type ZoneInfo } from '@/components/landing/ZipChecker';

export const dynamic = 'force-dynamic';

const TITLE = 'Garden State Water — 5-gallon water delivery in North Jersey';
const DESCRIPTION =
  'Fresh 5-gallon water jugs delivered to your home or business in North Jersey. Weekly and bi-weekly plans, easy online payment, no contracts.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: 'Garden State Water',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Garden State Water — water delivery in North Jersey' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og.png'] },
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

/** Crafted hero artwork: a stack of 5-gallon jugs. Swapped out automatically
 *  when a real photo is dropped in at public/photos/hero.jpg. */
function HeroArt() {
  return (
    <svg viewBox="0 0 320 300" role="img" aria-label="5-gallon water jugs" className="w-full max-w-sm">
      <defs>
        <linearGradient id="jug" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aee4f3" />
          <stop offset="1" stopColor="#38b1d7" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#76cfe9" />
          <stop offset="1" stopColor="#1c94bd" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="272" rx="130" ry="18" fill="#d4f1f9" />
      {[
        { x: 60, y: 90, s: 1 },
        { x: 175, y: 78, s: 1.08 },
      ].map(({ x, y, s }, i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="26" y="-14" width="28" height="18" rx="4" fill="#1c6081" />
          <path d="M8 12 Q8 0 22 0 h36 Q72 0 72 12 v14 H8 Z" fill="url(#jug)" />
          <rect x="2" y="24" width="76" height="150" rx="16" fill="url(#jug)" />
          <rect x="8" y="66" width="64" height="100" rx="12" fill="url(#water)" opacity="0.85" />
          <path d="M14 70 q10 10 0 22 q-8 12 2 20" stroke="#eefafd" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
          <rect x="8" y="36" width="64" height="6" rx="3" fill="#eefafd" opacity="0.6" />
        </g>
      ))}
      <g transform="translate(120 190)">
        <path d="M30 0 C30 0 12 24 12 37 a18 18 0 0 0 36 0 C48 24 30 0 30 0 Z" fill="#38b1d7" />
        <path d="M24 39 a7 7 0 0 0 7 7" stroke="#eefafd" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Stylized Garden State silhouette with route pins for each zone. */
function ServiceMap({ zones }: { zones: { id: string; name: string; color: string | null }[] }) {
  const pinSpots = [
    { x: 132, y: 64 },
    { x: 148, y: 92 },
    { x: 122, y: 108 },
    { x: 152, y: 128 },
  ];
  return (
    <svg viewBox="0 0 220 260" role="img" aria-label="Map of our New Jersey delivery area" className="mx-auto w-full max-w-[240px]">
      <defs>
        <linearGradient id="nj" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4f1f9" />
          <stop offset="1" stopColor="#aee4f3" />
        </linearGradient>
      </defs>
      {/* Stylized New Jersey */}
      <path
        d="M96 12 L128 20 L138 36 L132 54 L146 66 L142 86 L156 100 L150 122 L160 138 L152 162 L144 184 L132 204 L122 224 L112 240 L104 228 L92 234 L84 216 L76 196 L84 178 L70 164 L78 146 L64 134 L74 118 L60 106 L70 90 L58 76 L72 62 L66 44 L82 32 Z"
        fill="url(#nj)"
        stroke="#76cfe9"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text x="90" y="200" fontSize="13" fill="#1c6081" fontFamily="system-ui" transform="rotate(-72 96 196)" opacity="0.55" fontWeight="600" letterSpacing="3">
        NEW JERSEY
      </text>
      {zones.slice(0, 4).map((z, i) => (
        <g key={z.id} transform={`translate(${pinSpots[i].x} ${pinSpots[i].y})`}>
          <path d="M0 -16 C0 -16 -9 -4 -9 2 a9 9 0 0 0 18 0 C9 -4 0 -16 0 -16 Z" fill={z.color ?? '#1c94bd'} stroke="#fff" strokeWidth="2" />
          <circle cx="0" cy="1" r="3" fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string }>;
}) {
  const { signup } = await searchParams;
  const [config, zones, testimonials] = await Promise.all([
    getConfig(),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
    // Fail-soft: if the testimonials table hasn't been migrated yet, the
    // landing page must still render — the section simply stays hidden.
    prisma.testimonial
      .findMany({ where: { featured: true }, orderBy: { createdAt: 'desc' }, take: 3 })
      .catch(() => []),
  ]);

  const heroPhoto = existsSync(join(process.cwd(), 'public/photos/hero.jpg'))
    ? '/photos/hero.jpg'
    : null;

  const zoneDays = (days: number[]) =>
    days.length > 0 ? days.map((d) => WEEKDAYS[d] + 's').join(' & ') : 'Flexible days';
  const zoneInfos: ZoneInfo[] = zones.map((z) => ({
    name: z.name,
    zips: z.zips,
    days: zoneDays(z.deliveryDays),
    fee: z.deliveryFee > 0 ? `${money(z.deliveryFee)} delivery` : 'free delivery',
  }));

  // LocalBusiness structured data for search engines.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.businessName,
    description: DESCRIPTION,
    url: 'https://gardenstatewater.com',
    ...(config.businessPhone ? { telephone: config.businessPhone } : {}),
    ...(config.businessEmail ? { email: config.businessEmail } : {}),
    areaServed: zones.map((z) => z.name.replace(/^Zone \d+ — /, '')),
    priceRange: '$',
  };

  return (
    <div style={{ colorScheme: 'light' }} className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white">
      <script dangerouslySetInnerHTML={{ __html: forceLight }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
        <section className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-14">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-navy-900 md:text-5xl">
              Fresh 5-gallon water, delivered to your door.
            </h1>
            <p className="mt-4 max-w-xl text-xl text-slate-500">
              Home and business delivery across North Jersey. No contracts, no hauling jugs from the
              store — we bring them, you leave the empties out.
            </p>
            <div className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <a href="#signup" className={btnPrimary}>
                Get started — {money(config.jugRefillPrice)}/jug
              </a>
              <a href="/portal" className={btnGhost}>
                I&apos;m already a customer
              </a>
            </div>
          </div>
          <div className="flex justify-center">
            {heroPhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={heroPhoto}
                alt="Garden State Water delivery"
                className="max-h-80 w-full max-w-md rounded-3xl border border-aqua-100 object-cover shadow-xl shadow-aqua-100/60"
              />
            ) : (
              <HeroArt />
            )}
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
              <div className="text-4xl font-bold text-navy-900">
                {money(config.dispenserRentalPrice)}
                <span className="text-lg font-medium text-slate-400">/mo</span>
              </div>
              <div className="mt-1 text-lg font-semibold text-navy-900">Dispenser rental</div>
              <p className="mt-1 text-base text-slate-500">
                Hot &amp; cold countertop dispenser. First jug {money(config.jugPurchasePrice)} if you need your own bottles.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials — only renders once the owner has added real quotes */}
        {testimonials.length > 0 && (
          <section className="mt-12">
            <h2 className="text-center text-3xl font-bold text-navy-900">Neighbors who switched</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className={card}>
                  <Quote size={22} className="text-aqua-300" />
                  <blockquote className="mt-2 text-base text-slate-600">“{t.quote}”</blockquote>
                  <figcaption className="mt-3 text-base font-semibold text-navy-900">{t.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Service areas: map + zones + zip checker */}
        <section className="mt-12">
          <h2 className="text-center text-3xl font-bold text-navy-900">Where we deliver</h2>
          <div className="mt-6 grid items-center gap-6 md:grid-cols-2">
            <div className={card}>
              <ServiceMap zones={zones} />
            </div>
            <div className="space-y-3">
              {zones.map((z) => (
                <div key={z.id} className="flex items-center gap-3 rounded-2xl border border-aqua-100 bg-white px-4 py-3 shadow-sm">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: z.color ?? '#1c94bd' }} />
                  <div>
                    <div className="text-base font-semibold text-navy-900">{z.name.replace(/^Zone \d+ — /, '')}</div>
                    <div className="text-sm text-slate-500">
                      {zoneDays(z.deliveryDays)} · {z.deliveryFee > 0 ? `${money(z.deliveryFee)} delivery` : 'free delivery'}
                    </div>
                  </div>
                </div>
              ))}
              <ZipChecker zones={zoneInfos} />
            </div>
          </div>
        </section>

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
          {config.businessEmail && (
            <a href={`mailto:${config.businessEmail}`} className="hover:text-navy-900">
              {config.businessEmail}
            </a>
          )}
          <div className="mt-1 flex gap-4 text-sm text-slate-400">
            <a href="/portal" className="hover:text-navy-900">Customer portal</a>
            <a href="/login" className="hover:text-navy-900">Owner sign in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
