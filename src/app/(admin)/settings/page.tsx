import { Trash2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getConfig } from '@/lib/pricing';
import { money, shortDate } from '@/lib/format';
import { updateConfig } from '@/server/actions/pricing';
import { deleteZone, remapCustomerZones, runAutomationNow, upsertZone } from '@/server/actions/zones';
import { Badge, PageHeader } from '@/components/ui';

export default async function SettingsPage() {
  const [config, zones, recentNotifications] = await Promise.all([
    getConfig(),
    prisma.zone.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { customers: true } } } }),
    prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 25, include: { customer: true } }),
  ]);

  const integrations = [
    { name: 'Supabase auth', on: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: 'Stripe payments', on: Boolean(process.env.STRIPE_SECRET_KEY) },
    { name: 'Google Maps', on: Boolean(process.env.GOOGLE_MAPS_API_KEY) },
    { name: 'Resend email', on: Boolean(process.env.RESEND_API_KEY) },
    { name: 'Twilio SMS', on: Boolean(process.env.TWILIO_ACCOUNT_SID) },
  ];

  return (
    <>
      <PageHeader title="Settings" subtitle="Zones, automation, and integrations." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Delivery zones */}
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Delivery zones</h2>
          <p className="text-sm text-slate-500">
            Customers are matched to zones by zip code automatically; the zone sets their delivery fee.
          </p>
          <ul className="space-y-2">
            {zones.map((z) => {
              const del = deleteZone.bind(null, z.id);
              return (
                <li key={z.id} className="rounded-lg border border-slate-200 p-3 dark:border-navy-800">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {z.name}{' '}
                      <span className="text-sm font-normal text-slate-500">
                        · {z.deliveryFee > 0 ? `+${money(z.deliveryFee)} delivery` : 'free delivery'} ·{' '}
                        {z._count.customers} customers
                      </span>
                    </div>
                    <form action={del}>
                      <button className="p-1 text-slate-400 hover:text-red-600" aria-label={`Delete ${z.name}`}>
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">zips: {z.zips.join(', ') || 'none'}</div>
                </li>
              );
            })}
            {zones.length === 0 && <li className="text-sm text-slate-400">No zones yet — everyone pays the flat fee.</li>}
          </ul>
          <details className="pt-1">
            <summary className="cursor-pointer text-sm font-medium text-aqua-600">Add zone</summary>
            <form action={upsertZone} className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input name="name" required className="input" placeholder="Zone 2" />
              </div>
              <div>
                <label className="label">Delivery fee ($)</label>
                <input type="number" step="0.5" name="deliveryFee" defaultValue={0} className="input" />
              </div>
              <div className="col-span-2">
                <label className="label">Zip codes (comma separated)</label>
                <input name="zips" className="input" placeholder="07102, 07103, 07104" />
              </div>
              <div className="col-span-2">
                <button className="btn-secondary w-full">Save zone</button>
              </div>
            </form>
          </details>
          <form action={remapCustomerZones}>
            <button className="btn-secondary w-full">Re-match all customers to zones by zip</button>
          </form>
        </div>

        {/* Automation config */}
        <form action={updateConfig} className="card space-y-3 p-4">
          <h2 className="font-semibold">Automation</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Low-stock threshold (jugs)</label>
              <input type="number" name="lowStockThreshold" defaultValue={config.lowStockThreshold} className="input" />
            </div>
            <div>
              <label className="label">Auto-suspend after (days overdue)</label>
              <input type="number" name="overdueSuspendDays" defaultValue={config.overdueSuspendDays} className="input" />
            </div>
            <div>
              <label className="label">Loyalty message after (months)</label>
              <input type="number" name="loyaltyMonths" defaultValue={config.loyaltyMonths} className="input" />
            </div>
            <div>
              <label className="label">Gas cost per mile ($)</label>
              <input type="number" step="0.01" name="gasCostPerMile" defaultValue={config.gasCostPerMile} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="autoSuspendEnabled__present" value="1" />
            <input type="checkbox" name="autoSuspendEnabled" defaultChecked={config.autoSuspendEnabled} className="h-4 w-4" />
            Auto-suspend accounts {config.overdueSuspendDays}+ days overdue (override by reactivating on the profile)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="loyaltyEnabled__present" value="1" />
            <input type="checkbox" name="loyaltyEnabled" defaultChecked={config.loyaltyEnabled} className="h-4 w-4" />
            Send birthday & loyalty thank-you emails
          </label>
          <button className="btn-primary">Save automation settings</button>
          <div className="border-t border-slate-100 pt-3 dark:border-navy-800">
            <p className="mb-2 text-xs text-slate-400">
              The daily automation runs every morning via Vercel Cron: delivery reminders for tomorrow,
              overdue flagging + payment reminders (7/14/30 days), auto-suspension, loyalty messages, and
              your morning summary email.
            </p>
            <button formAction={runAutomationNow} className="btn-secondary">
              Run daily automation now
            </button>
          </div>
        </form>

        {/* Integrations */}
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">Integrations</h2>
          <ul className="space-y-1.5 text-sm">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between">
                <span>{i.name}</span>
                <Badge tone={i.on ? 'green' : 'slate'}>{i.on ? 'connected' : 'not configured'}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Everything works without keys (emails log to the console, routes use built-in estimates).
            Add keys in .env / Vercel env vars to switch the real services on.
          </p>
        </div>

        {/* Notification log */}
        <div className="card overflow-x-auto p-4">
          <h2 className="mb-2 font-semibold">Recent notifications</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>To</th>
                <th>OK</th>
              </tr>
            </thead>
            <tbody>
              {recentNotifications.map((n) => (
                <tr key={n.id}>
                  <td className="whitespace-nowrap text-slate-500">{shortDate(n.createdAt)}</td>
                  <td className="text-xs">{n.type.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="max-w-40 truncate text-slate-500">{n.customer?.name ?? n.recipient}</td>
                  <td>{n.success ? '✓' : <span title={n.error ?? ''}>✗</span>}</td>
                </tr>
              ))}
              {recentNotifications.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    Nothing sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
