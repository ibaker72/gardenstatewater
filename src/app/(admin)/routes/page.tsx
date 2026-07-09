import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, ExternalLink, Navigation } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { fullAddress, isoDate, money, shortDate } from '@/lib/format';
import { appleMapsUrl, googleMapsDirectionsUrl } from '@/lib/routing';
import { buildRoute, moveStop, toggleStopCompleted } from '@/server/actions/routes';
import { PageHeader, StatCard } from '@/components/ui';

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: { date?: string; error?: string; built?: string };
}) {
  const dateStr = searchParams.date ?? isoDate(new Date());
  const date = new Date(dateStr + 'T00:00:00');

  const [route, dayOrderCount, recentRoutes] = await Promise.all([
    prisma.route.findFirst({
      where: { date },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          include: { order: { include: { customer: true, items: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({
      where: { deliveryDate: date, status: { in: ['SCHEDULED', 'OUT_FOR_DELIVERY'] } },
    }),
    prisma.route.findMany({ orderBy: { date: 'desc' }, take: 5, include: { stops: true } }),
  ]);

  const embedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const stopAddresses = route?.stops.map((s) => fullAddress(s.order.customer)) ?? [];
  const gmapsUrl = route ? googleMapsDirectionsUrl(route.startAddress ?? 'Newark, NJ', stopAddresses) : '#';
  const completed = route?.stops.filter((s) => s.completedAt).length ?? 0;
  const expectedRevenue = route?.stops.reduce((s, st) => s + st.order.total, 0) ?? 0;

  const embedUrl =
    embedKey && route && stopAddresses.length > 0
      ? `https://www.google.com/maps/embed/v1/directions?key=${embedKey}` +
        `&origin=${encodeURIComponent(route.startAddress ?? 'Newark, NJ')}` +
        `&destination=${encodeURIComponent(stopAddresses[stopAddresses.length - 1])}` +
        (stopAddresses.length > 1
          ? `&waypoints=${encodeURIComponent(stopAddresses.slice(0, -1).slice(0, 9).join('|'))}`
          : '') +
        `&mode=driving`
      : null;

  return (
    <>
      <PageHeader
        title="Route optimization"
        subtitle={shortDate(date)}
        actions={
          route && (
            <a href={gmapsUrl} target="_blank" rel="noreferrer" className="btn-primary">
              <Navigation size={15} /> Open in Google Maps
            </a>
          )
        }
      />

      {searchParams.error === 'noorders' && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          No open orders on that date — schedule orders first, then build the route.
        </p>
      )}

      {/* Build/rebuild */}
      <form action={buildRoute} className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Delivery date</label>
          <input type="date" name="date" defaultValue={dateStr} required className="input" />
        </div>
        <div className="min-w-52 flex-1">
          <label className="label">Start address (home base)</label>
          <input
            name="startAddress"
            defaultValue={route?.startAddress ?? ''}
            placeholder="Newark, NJ"
            className="input"
          />
        </div>
        <button className="btn-primary">
          {route ? 'Rebuild route' : `Optimize ${dayOrderCount} stops`}
        </button>
        <p className="w-full text-xs text-slate-400">
          {process.env.GOOGLE_MAPS_API_KEY
            ? 'Using Google Distance Matrix for real drive times.'
            : 'No Google Maps key set — using built-in distance estimates. Add GOOGLE_MAPS_API_KEY for real drive times.'}
        </p>
      </form>

      {route && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Stops" value={`${completed}/${route.stops.length}`} sub="completed" />
            <StatCard label="Total miles" value={route.totalMiles ?? '—'} sub={route.optimizedWith === 'google' ? 'Google-measured' : 'estimated'} />
            <StatCard
              label="Drive time"
              value={route.totalMinutes ? `${Math.floor(route.totalMinutes / 60)}h ${route.totalMinutes % 60}m` : '—'}
              sub="driving only"
            />
            <StatCard label="Route revenue" value={money(expectedRevenue)} sub="expected" />
          </div>

          {embedUrl && (
            <div className="card mb-4 overflow-hidden">
              <iframe
                src={embedUrl}
                className="h-72 w-full border-0 md:h-96"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Route map"
              />
            </div>
          )}

          <ol className="space-y-2">
            {route.stops.map((stop, idx) => {
              const c = stop.order.customer;
              const done = stop.completedAt !== null;
              const toggle = toggleStopCompleted.bind(null, stop.id);
              const up = moveStop.bind(null, stop.id, 'up' as const);
              const down = moveStop.bind(null, stop.id, 'down' as const);
              return (
                <li key={stop.id} className={`card flex items-center gap-3 p-3 ${done ? 'opacity-55' : ''}`}>
                  <form action={toggle}>
                    <button
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-bold transition-colors ${
                        done
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 text-slate-500 hover:border-aqua-500 dark:border-navy-700'
                      }`}
                      aria-label={done ? 'Mark stop incomplete' : 'Mark stop complete'}
                    >
                      {done ? <Check size={16} /> : idx + 1}
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <Link href={`/orders/${stop.orderId}`} className="font-semibold hover:underline">
                        {c.name}
                      </Link>
                      <span className="text-sm font-medium tabular-nums">{money(stop.order.total)}</span>
                    </div>
                    <div className="truncate text-sm text-slate-500">{fullAddress(c)}</div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-400">
                      {stop.milesFromPrev !== null && (
                        <span>
                          {stop.milesFromPrev} mi · {stop.minutesFromPrev} min from prev
                        </span>
                      )}
                      <a href={appleMapsUrl(fullAddress(c))} className="inline-flex items-center gap-0.5 text-aqua-600" target="_blank" rel="noreferrer">
                         Apple Maps <ExternalLink size={10} />
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(c))}`}
                        className="inline-flex items-center gap-0.5 text-aqua-600"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Google Maps <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <form action={up}>
                      <button className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800" aria-label="Move stop up">
                        <ArrowUp size={15} />
                      </button>
                    </form>
                    <form action={down}>
                      <button className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800" aria-label="Move stop down">
                        <ArrowDown size={15} />
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {!route && recentRoutes.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="px-4 pt-4 font-semibold">Recent routes</h2>
          <table className="table-base mt-2">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Stops</th>
                <th className="text-right">Miles</th>
                <th className="text-right">Minutes</th>
              </tr>
            </thead>
            <tbody>
              {recentRoutes.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/routes?date=${isoDate(r.date)}`} className="text-aqua-600 hover:underline">
                      {shortDate(r.date)}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{r.stops.length}</td>
                  <td className="text-right tabular-nums">{r.totalMiles ?? '—'}</td>
                  <td className="text-right tabular-nums">{r.totalMinutes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
