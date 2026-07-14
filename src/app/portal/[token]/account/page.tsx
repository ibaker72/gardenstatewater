import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, PauseCircle, UserRound } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { fullAddress, isoDate, PLAN_LABELS, WEEKDAYS } from '@/lib/format';
import {
  requestAccountChange,
  requestCancel,
  requestPause,
} from '@/server/actions/portal';
import { CancelServiceForm } from '@/components/portal/CancelServiceForm';

export const dynamic = 'force-dynamic';

const card = 'rounded-3xl border border-aqua-100 bg-white p-5 shadow-lg shadow-aqua-100/40';
const input =
  'h-14 w-full rounded-2xl border border-aqua-200 bg-white px-5 text-base text-navy-900 placeholder:text-slate-400 focus:border-aqua-500 focus:outline-none focus:ring-4 focus:ring-aqua-100';
const bigBtn =
  'flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold transition active:scale-[0.99]';

const CONFIRMATIONS: Record<string, string> = {
  info: '✓ Change request sent — we’ll review it and update your account shortly.',
  pause: '✓ Pause request sent — we’ll confirm it with you shortly.',
  cancel: '✓ We got your cancellation request — we’ll reach out to you today.',
};

export default async function PortalAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ requested?: string }>;
}) {
  const [{ token }, { requested }] = await Promise.all([params, searchParams]);
  const customer = await prisma.customer.findUnique({
    where: { portalToken: token },
    include: { zone: true },
  });
  if (!customer || !customer.portalAccess) notFound();

  const change = requestAccountChange.bind(null, token);
  const pause = requestPause.bind(null, token);
  const cancel = requestCancel.bind(null, token);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white pb-10">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-6">
        <Link
          href={`/portal/${token}`}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-medium text-slate-500 hover:bg-white/70 hover:text-navy-900"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-xl font-bold text-navy-900">My account</h1>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-5 pt-5">
        {requested && CONFIRMATIONS[requested] && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-800">
            {CONFIRMATIONS[requested]}
          </p>
        )}

        {/* On file */}
        <section className={card}>
          <div className="flex items-center gap-2">
            <UserRound size={19} className="text-aqua-600" />
            <h2 className="text-lg font-semibold text-navy-900">On file with us</h2>
          </div>
          <dl className="mt-3 space-y-2.5 text-base">
            <div>
              <dt className="text-sm font-medium text-slate-500">Name</dt>
              <dd className="text-navy-900">{customer.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Address</dt>
              <dd className="flex items-start gap-1.5 text-navy-900">
                <MapPin size={16} className="mt-1 shrink-0 text-slate-400" />
                {fullAddress(customer)}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">Phone</dt>
                <dd className="text-navy-900">{customer.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="break-all text-navy-900">{customer.email ?? '—'}</dd>
              </div>
            </div>
            {customer.deliveryNotes && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Delivery notes</dt>
                <dd className="text-navy-900">📝 {customer.deliveryNotes}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-aqua-50 px-4 py-3 text-base">
            <div>
              <div className="text-sm font-medium text-slate-500">Your plan</div>
              <div className="font-semibold text-navy-900">
                {PLAN_LABELS[customer.plan]} · {customer.planJugs} jug{customer.planJugs === 1 ? '' : 's'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">Delivery day</div>
              <div className="font-semibold text-navy-900">
                {customer.preferredDay !== null ? `${WEEKDAYS[customer.preferredDay]}s` : 'Flexible'}
              </div>
            </div>
          </div>
        </section>

        {/* Request a change */}
        <section className={card}>
          <h2 className="text-lg font-semibold text-navy-900">Request a change</h2>
          <p className="mt-1 text-base text-slate-500">
            Update anything below and send it over — we review changes before they take effect.
          </p>
          <form action={change} className="mt-3 space-y-3">
            <input name="name" defaultValue={customer.name} className={input} aria-label="Name" placeholder="Name" />
            <div className="grid grid-cols-2 gap-3">
              <input name="phone" type="tel" inputMode="tel" defaultValue={customer.phone ?? ''} className={input} aria-label="Phone" placeholder="Phone" />
              <input name="email" type="email" defaultValue={customer.email ?? ''} className={input} aria-label="Email" placeholder="Email" />
            </div>
            <input name="address" defaultValue={customer.address} className={input} aria-label="Street address" placeholder="Street address" />
            <div className="grid grid-cols-2 gap-3">
              <input name="city" defaultValue={customer.city ?? ''} className={input} aria-label="City" placeholder="City" />
              <input name="zip" inputMode="numeric" defaultValue={customer.zip ?? ''} className={input} aria-label="Zip" placeholder="Zip" />
            </div>
            <input
              name="deliveryNotes"
              defaultValue={customer.deliveryNotes ?? ''}
              className={input}
              aria-label="Delivery notes"
              placeholder='Delivery notes — e.g. "leave at side gate"'
            />
            <button className={`${bigBtn} w-full bg-aqua-500 text-white hover:bg-aqua-600`}>
              Send change request
            </button>
          </form>
        </section>

        {/* Pause */}
        <section className={card} id="pause">
          <div className="flex items-center gap-2">
            <PauseCircle size={19} className="text-aqua-600" />
            <h2 className="text-lg font-semibold text-navy-900">Pause my deliveries</h2>
          </div>
          <p className="mt-1 text-base text-slate-500">
            Going away? Pick the dates and we&apos;ll hold your deliveries.
          </p>
          <form action={pause} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500" htmlFor="pause-from">
                  Pause from
                </label>
                <input id="pause-from" name="from" type="date" required min={isoDate(tomorrow)} className={input} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500" htmlFor="pause-to">
                  Back on (optional)
                </label>
                <input id="pause-to" name="to" type="date" className={input} />
              </div>
            </div>
            <button className={`${bigBtn} w-full border border-aqua-200 bg-white text-navy-900 hover:bg-aqua-50`}>
              <PauseCircle size={20} /> Request pause
            </button>
          </form>
        </section>

        {/* Cancel */}
        <section className={card}>
          <h2 className="text-lg font-semibold text-navy-900">Cancel service</h2>
          <div className="mt-3">
            <CancelServiceForm action={cancel} />
          </div>
        </section>
      </main>
    </div>
  );
}
