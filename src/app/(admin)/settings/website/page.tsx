import Link from 'next/link';
import { Download, ExternalLink, Trash2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { shortDate } from '@/lib/format';
import {
  addServiceZips,
  deleteDeal,
  deleteServiceZip,
  deleteWaitlistEntry,
  setWaitlistContacted,
  toggleDeal,
  updateSitePlan,
  upsertDeal,
} from '@/server/actions/website';
import { Badge, PageHeader } from '@/components/ui';

/**
 * Settings → Website: everything the public marketing site renders from —
 * plans, deals/banner, serviceable ZIPs, the expansion waitlist, and
 * referral activity.
 */
export default async function WebsiteSettingsPage() {
  const [plans, deals, serviceZips, zones, waitlist, referralCustomers, credits] = await Promise.all([
    prisma.sitePlan.findMany({ orderBy: { sortOrder: 'asc' } }).catch(() => []),
    prisma.deal.findMany({ orderBy: [{ slot: 'asc' }, { sortOrder: 'asc' }] }).catch(() => []),
    prisma.serviceZip.findMany({ orderBy: [{ state: 'asc' }, { region: 'asc' }, { town: 'asc' }, { zip: 'asc' }] }).catch(() => []),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }).catch(() => []),
    prisma.waitlistEntry.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
    prisma.customer
      .findMany({
        where: { referralCode: { not: null } },
        select: { id: true, name: true, referralCode: true, _count: { select: { referrals: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      .catch(() => []),
    prisma.referralCredit
      .findMany({ include: { customer: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 25 })
      .catch(() => []),
  ]);

  const regions = new Map<string, typeof serviceZips>();
  for (const row of serviceZips) {
    const key = `${row.region} · ${row.state}`;
    regions.set(key, [...(regions.get(key) ?? []), row]);
  }

  return (
    <>
      <PageHeader
        title="Website"
        subtitle="What gardenstatewater.com shows: plans, deals, service areas, waitlist, referrals."
      />
      <p className="mb-4 -mt-2 text-sm text-slate-500">
        <Link href="/settings" className="text-aqua-600 hover:underline">← Back to settings</Link>
        {' · '}
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-aqua-600 hover:underline">
          View the live site <ExternalLink size={13} />
        </a>
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Public plans */}
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Public pricing plans</h2>
          <p className="text-sm text-slate-500">
            Shown on the homepage pricing table and the signup flow. Prices here are the single
            source of truth for the public site.
          </p>
          <ul className="space-y-3">
            {plans.map((plan) => (
              <li key={plan.key} className="rounded-lg border border-slate-200 p-3 dark:border-navy-800">
                <form action={updateSitePlan} className="space-y-2">
                  <input type="hidden" name="key" value={plan.key} />
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">
                      {plan.name}{' '}
                      <span className="text-sm font-normal text-slate-500">
                        · {plan.jugsPerMonth} jugs/mo · {plan.priceUnit === 'jug' ? 'per jug' : 'per month'}
                      </span>
                    </div>
                    <Badge tone={plan.active ? 'green' : 'slate'}>{plan.active ? 'live' : 'hidden'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Price ($)</label>
                      <input name="monthlyPrice" type="number" step="0.01" min="0" defaultValue={plan.monthlyPrice} className="input" />
                    </div>
                    <div>
                      <label className="label">Badge</label>
                      <input name="badge" defaultValue={plan.badge ?? ''} placeholder="Most Popular" className="input" />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Tagline</label>
                      <input name="tagline" defaultValue={plan.tagline ?? ''} className="input" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="active" defaultChecked={plan.active} className="h-4 w-4" />
                      Show on the website
                    </label>
                    <button className="btn-secondary">Save</button>
                  </div>
                </form>
              </li>
            ))}
            {plans.length === 0 && (
              <li className="text-sm text-slate-400">
                No plans yet — run the phase-4 migration (0006) or the seed to load the launch tiers.
              </li>
            )}
          </ul>
        </div>

        {/* Deals & banner */}
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Deals & seasonal banner</h2>
          <p className="text-sm text-slate-500">
            “Offer” rows fill the Deals section; the first active “banner” row is the strip above
            the site header (your seasonal special).
          </p>
          <ul className="space-y-2">
            {deals.map((deal) => {
              const del = deleteDeal.bind(null, deal.id);
              const toggle = toggleDeal.bind(null, deal.id, !deal.active);
              return (
                <li key={deal.id} className="rounded-lg border border-slate-200 p-3 dark:border-navy-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={deal.slot === 'banner' ? 'blue' : 'amber'}>{deal.slot}</Badge>
                        <span className="font-medium">{deal.title}</span>
                        {!deal.active && <Badge tone="slate">off</Badge>}
                      </div>
                      {deal.description && <p className="mt-1 text-sm text-slate-500">{deal.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={toggle}>
                        <button className="btn-secondary !px-2 !py-1 text-xs">{deal.active ? 'Turn off' : 'Turn on'}</button>
                      </form>
                      <form action={del}>
                        <button className="p-1 text-slate-400 hover:text-red-600" aria-label={`Delete deal: ${deal.title}`}>
                          <Trash2 size={15} />
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
            {deals.length === 0 && <li className="text-sm text-slate-400">No deals yet.</li>}
          </ul>
          <details className="pt-1">
            <summary className="cursor-pointer text-sm font-medium text-aqua-600">Add deal / banner</summary>
            <form action={upsertDeal} className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Slot</label>
                  <select name="slot" className="input">
                    <option value="offer">Offer (deals section)</option>
                    <option value="banner">Banner (top strip)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Badge (optional)</label>
                  <input name="badge" className="input" placeholder="Limited time" />
                </div>
              </div>
              <div>
                <label className="label">Title</label>
                <input name="title" required className="input" placeholder="Summer special: …" />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input name="description" className="input" />
              </div>
              <button className="btn-secondary w-full">Add</button>
            </form>
          </details>
        </div>

        {/* Serviceable ZIPs */}
        <div className="card space-y-3 p-4 lg:col-span-2">
          <h2 className="font-semibold">Serviceable ZIP codes ({serviceZips.length})</h2>
          <p className="text-sm text-slate-500">
            The website’s ZIP checker, service-area grid, and the per-town SEO pages
            (/water-delivery/…) all render from this list. Assigning a zone routes new signups
            automatically.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {[...regions.entries()].map(([label, rows]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-navy-800">
                <div className="mb-2 text-sm font-semibold">{label}</div>
                <ul className="flex flex-wrap gap-1.5">
                  {rows.map((row) => {
                    const del = deleteServiceZip.bind(null, row.zip);
                    return (
                      <li
                        key={row.zip}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                          row.active
                            ? 'border-slate-200 dark:border-navy-700'
                            : 'border-slate-200 opacity-50 dark:border-navy-700'
                        }`}
                        title={`${row.town} (${row.zip})${row.zoneId ? ' · zoned' : ''}`}
                      >
                        <span className="font-medium">{row.zip}</span>
                        <span className="text-slate-400">{row.town}</span>
                        <form action={del} className="flex">
                          <button className="text-slate-400 hover:text-red-600" aria-label={`Remove ${row.zip}`}>
                            <Trash2 size={11} />
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {serviceZips.length === 0 && (
              <p className="text-sm text-slate-400">
                No ZIPs yet — run the phase-4 migration (0006) or the seed to load the launch list.
              </p>
            )}
          </div>
          <details className="pt-1">
            <summary className="cursor-pointer text-sm font-medium text-aqua-600">Add ZIPs</summary>
            <form action={addServiceZips} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="label">Town</label>
                <input name="town" required className="input" placeholder="Montclair" />
              </div>
              <div>
                <label className="label">State</label>
                <select name="state" className="input">
                  <option value="NJ">NJ</option>
                  <option value="NY">NY</option>
                </select>
              </div>
              <div>
                <label className="label">Region</label>
                <input name="region" required className="input" placeholder="North Jersey" list="region-list" />
                <datalist id="region-list">
                  {[...new Set(serviceZips.map((z) => z.region))].map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label">Zone (optional)</label>
                <select name="zoneId" className="input">
                  <option value="">— none —</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="label">ZIP codes (comma or space separated)</label>
                <input name="zips" required className="input" placeholder="07042, 07043" />
              </div>
              <div className="flex items-end">
                <button className="btn-secondary w-full">Add</button>
              </div>
            </form>
          </details>
        </div>

        {/* Waitlist */}
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Expansion waitlist ({waitlist.length})</h2>
            <a href="/api/website/waitlist" className="btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs">
              <Download size={13} /> Export CSV
            </a>
          </div>
          <p className="text-sm text-slate-500">
            Visitors outside the service area who asked to be texted when you arrive — this is your
            expansion map.
          </p>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>ZIP</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((entry) => {
                  const toggle = setWaitlistContacted.bind(null, entry.id, !entry.contacted);
                  const del = deleteWaitlistEntry.bind(null, entry.id);
                  return (
                    <tr key={entry.id} className={entry.contacted ? 'opacity-50' : undefined}>
                      <td className="whitespace-nowrap text-slate-500">{shortDate(entry.createdAt)}</td>
                      <td>{entry.name}</td>
                      <td className="whitespace-nowrap">{entry.phone}</td>
                      <td className="whitespace-nowrap">
                        {entry.zip}
                        {entry.town && <span className="text-slate-400"> ({entry.town})</span>}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <form action={toggle}>
                            <button className="btn-secondary !px-2 !py-1 text-xs">
                              {entry.contacted ? 'Un-contact' : 'Contacted'}
                            </button>
                          </form>
                          <form action={del}>
                            <button className="p-1 text-slate-400 hover:text-red-600" aria-label="Delete waitlist entry">
                              <Trash2 size={14} />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {waitlist.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">Nobody yet — it fills from the homepage ZIP checker.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referrals */}
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Referral program</h2>
          <p className="text-sm text-slate-500">
            Each customer’s shareable code lives in their portal. A signup with a code credits a
            free jug to both sides — apply credits on a delivery, then mark them redeemed from the
            customer profile.
          </p>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Code</th>
                  <th>Referrals</th>
                </tr>
              </thead>
              <tbody>
                {referralCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/customers/${c.id}`} className="text-aqua-600 hover:underline">{c.name}</Link>
                    </td>
                    <td className="font-mono text-xs">{c.referralCode}</td>
                    <td>{c._count.referrals}</td>
                  </tr>
                ))}
                {referralCustomers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-400">
                      Codes are minted when customers open their portal or sign up online.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <h3 className="pt-1 text-sm font-semibold">Recent credits</h3>
          <ul className="space-y-1 text-sm">
            {credits.map((credit) => (
              <li key={credit.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {credit.customer.name} — {credit.reason}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {credit.jugs} jug · {credit.redeemedAt ? `redeemed ${shortDate(credit.redeemedAt)}` : 'open'}
                </span>
              </li>
            ))}
            {credits.length === 0 && <li className="text-slate-400">No credits issued yet.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
