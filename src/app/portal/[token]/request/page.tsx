import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { friendlyDay, shortDate, upcomingDeliveryDates, WEEKDAYS } from '@/lib/format';
import { requestDeliveryOrder } from '@/server/actions/portal';
import { RequestDeliveryForm, type DateOption } from '@/components/portal/RequestDeliveryForm';

export const dynamic = 'force-dynamic';

const card = 'rounded-3xl border border-aqua-100 bg-white p-5 shadow-lg shadow-aqua-100/40';
const bigLink =
  'flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 text-base font-semibold transition active:scale-[0.99]';

export default async function RequestDeliveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sent?: string; jugs?: string; date?: string }>;
}) {
  const [{ token }, { sent, jugs, date }] = await Promise.all([params, searchParams]);
  const customer = await prisma.customer.findUnique({
    where: { portalToken: token },
    include: { zone: true },
  });
  if (!customer || !customer.portalAccess) notFound();

  // Confirmation screen after a successful request.
  if (sent) {
    const confirmedDate = date ? new Date(date + 'T00:00:00') : null;
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-aqua-50 via-white to-white px-5 py-10">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center text-center">
          <CheckCircle2 size={64} className="mx-auto text-emerald-500" />
          <h1 className="mt-4 text-3xl font-bold text-navy-900">Request sent!</h1>
          <p className="mt-2 text-lg text-slate-600">
            {jugs ? `${jugs} jug${jugs === '1' ? '' : 's'}` : 'Your delivery'}
            {confirmedDate ? ` on ${WEEKDAYS[confirmedDate.getDay()]}, ${shortDate(confirmedDate)}` : ''}.
          </p>
          <p className="mt-3 text-lg font-medium text-navy-900">
            We&apos;ll confirm your delivery within 2 hours! 💧
          </p>
          <div className="mt-8 space-y-3">
            <Link href={`/portal/${token}`} className={`${bigLink} w-full bg-aqua-500 text-white hover:bg-aqua-600`}>
              Back to my account
            </Link>
            <Link
              href={`/portal/${token}/deliveries`}
              className={`${bigLink} w-full border border-aqua-200 bg-white text-navy-900 hover:bg-aqua-50`}
            >
              See my deliveries
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const dates: DateOption[] = upcomingDeliveryDates(customer.zone?.deliveryDays ?? [], 8).map(
    (d) => {
      const label = friendlyDay(d);
      // Within a week the label is just a weekday name — add the date under it.
      const sub = label.includes(',') ? '' : shortDate(d).replace(/, \d{4}$/, '');
      return { iso: d.toISOString().slice(0, 10), label, sub };
    }
  );

  const request = requestDeliveryOrder.bind(null, token);

  return (
    <div className="min-h-screen bg-gradient-to-b from-aqua-50 via-white to-white pb-10">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-6">
        <Link
          href={`/portal/${token}`}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-base font-medium text-slate-500 hover:bg-white/70 hover:text-navy-900"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-xl font-bold text-navy-900">Request a delivery</h1>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-4 px-5 pt-5">
        <section className={card}>
          <RequestDeliveryForm action={request} dates={dates} defaultJugs={customer.planJugs} />
        </section>
        <p className="text-center text-sm text-slate-400">
          {customer.zone && customer.zone.deliveryDays.length > 0
            ? `We deliver to your area on ${customer.zone.deliveryDays.map((d) => WEEKDAYS[d] + 's').join(' and ')}.`
            : 'Pick whichever day works best — we deliver to your area all week.'}
        </p>
      </main>
    </div>
  );
}
