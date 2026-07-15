import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KeyRound, Mail, MapPin, MessageSquare, Pencil, Phone, Send } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { customerBalance, isAtRisk, lastDeliveryDates } from '@/lib/data';
import { fullAddress, money, PLAN_LABELS, shortDate, timeAgoDays, WEEKDAYS } from '@/lib/format';
import { addCommLog, adjustCustomerJugs, setCustomerStatus } from '@/server/actions/customers';
import { sendPortalInvite, setPortalAccess, setPortalPin } from '@/server/actions/portal-admin';
import { Badge, LinkButton, ORDER_STATUS_TONE, PageHeader } from '@/components/ui';
import { STATUS_LABELS } from '@/lib/format';

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      zone: true,
      commLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      orders: { orderBy: { deliveryDate: 'desc' }, take: 15, include: { items: true } },
      payments: { orderBy: { receivedAt: 'desc' }, take: 10 },
    },
  });
  if (!customer) notFound();

  const [balance, lastMap] = await Promise.all([
    customerBalance(customer.id),
    lastDeliveryDates([customer.id]),
  ]);
  const lastDelivery = lastMap.get(customer.id);
  const atRisk = customer.status === 'ACTIVE' && isAtRisk(lastDelivery, customer.createdAt);
  const daysSince = timeAgoDays(lastDelivery);

  const logComm = addCommLog.bind(null, customer.id);
  const invite = sendPortalInvite.bind(null, customer.id);
  const toggleAccess = setPortalAccess.bind(null, customer.id, !customer.portalAccess);
  const setPin = setPortalPin.bind(null, customer.id);

  async function adjustJugs(form: FormData) {
    'use server';
    const delta = Number(form.get('delta') ?? 0);
    const reason = String(form.get('reason') ?? 'adjustment');
    if (delta !== 0) await adjustCustomerJugs(id, delta, reason);
  }

  async function changeStatus(form: FormData) {
    'use server';
    const status = String(form.get('status')) as 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'CHURNED';
    await setCustomerStatus(id, status);
  }

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={`Customer since ${shortDate(customer.startedAt)}`}
        actions={
          <>
            <LinkButton href={`/orders/new?customer=${customer.id}`}>New order</LinkButton>
            <LinkButton href={`/customers/${customer.id}/edit`} variant="secondary">
              <Pencil size={14} /> Edit
            </LinkButton>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge tone={customer.status === 'ACTIVE' ? 'green' : customer.status === 'SUSPENDED' ? 'red' : 'slate'}>
          {customer.status}
        </Badge>
        <Badge tone="blue">{PLAN_LABELS[customer.plan]}</Badge>
        {customer.accountType === 'COMMERCIAL' && <Badge tone="navy">Commercial</Badge>}
        {customer.accountType === 'EVENT' && <Badge tone="navy">Event</Badge>}
        {customer.dispenserRental && <Badge tone="blue">Dispenser rental</Badge>}
        {atRisk && <Badge tone="amber">At risk — no delivery in {daysSince ?? '30+'} days</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contact & delivery info */}
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Contact</h2>
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <a
              className="hover:underline"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(customer))}`}
            >
              {fullAddress(customer)}
            </a>
          </div>
          {customer.deliveryNotes && (
            <p className="rounded-lg bg-aqua-50 px-3 py-2 text-sm text-aqua-900 dark:bg-aqua-900/30 dark:text-aqua-100">
              📝 {customer.deliveryNotes}
            </p>
          )}
          <div className="flex gap-2">
            {customer.phone && (
              <>
                <a href={`tel:${customer.phone}`} className="btn-secondary flex-1">
                  <Phone size={14} /> Call
                </a>
                <a href={`sms:${customer.phone}`} className="btn-secondary flex-1">
                  <MessageSquare size={14} /> Text
                </a>
              </>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="btn-secondary flex-1">
                <Mail size={14} /> Email
              </a>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Zone</dt>
              <dd>{customer.zone ? `${customer.zone.name} (${customer.zone.deliveryFee > 0 ? `+${money(customer.zone.deliveryFee)}` : 'free'})` : 'Unzoned'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Preferred day</dt>
              <dd>{customer.preferredDay !== null ? WEEKDAYS[customer.preferredDay] : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Jugs / delivery</dt>
              <dd>{customer.planJugs}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Prefers to pay</dt>
              <dd>{customer.paymentPref ? customer.paymentPref.charAt(0) + customer.paymentPref.slice(1).toLowerCase() : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Portal link</dt>
              <dd>
                <Link href={`/portal/${customer.portalToken}`} className="text-aqua-600 hover:underline" target="_blank">
                  Open portal
                </Link>
              </dd>
            </div>
          </dl>
          <form action={changeStatus} className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-navy-800">
            {customer.status !== 'ACTIVE' && (
              <button name="status" value="ACTIVE" className="btn-secondary text-emerald-700 dark:text-emerald-400">
                Reactivate
              </button>
            )}
            {customer.status === 'ACTIVE' && (
              <>
                <button name="status" value="PAUSED" className="btn-secondary">
                  Pause service
                </button>
                <button name="status" value="SUSPENDED" className="btn-secondary text-red-600">
                  Suspend
                </button>
              </>
            )}
          </form>

          {/* Customer portal management */}
          <div className="border-t border-slate-100 pt-3 dark:border-navy-800">
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Customer portal</h3>
              <Badge tone={customer.portalAccess ? 'green' : 'slate'}>
                {customer.portalAccess ? 'on' : 'off'}
              </Badge>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              Last signed in:{' '}
              {customer.portalLastLoginAt ? shortDate(customer.portalLastLoginAt) : 'never'} · PIN:{' '}
              {customer.portalPin ? 'set' : 'not set'}
            </p>
            <div className="flex flex-wrap gap-2">
              {customer.portalAccess && (customer.phone || customer.email) && (
                <form action={invite}>
                  <button className="btn-secondary" title="Text/email them their sign-in link">
                    <Send size={14} /> Send portal invite
                  </button>
                </form>
              )}
              <form action={toggleAccess}>
                <button
                  className={`btn-secondary ${customer.portalAccess ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}
                  title={customer.portalAccess ? 'Blocks sign-in and ends their sessions' : 'Allow portal sign-in again'}
                >
                  {customer.portalAccess ? 'Turn portal off' : 'Turn portal on'}
                </button>
              </form>
            </div>
            <form action={setPin} className="mt-2 flex gap-2">
              <input
                name="pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder={customer.portalPin ? 'New 4-digit PIN' : '4-digit PIN'}
                className="input w-36"
                title="4 digits; leave empty and save to remove the PIN"
              />
              <button className="btn-secondary" title="Set the PIN (empty clears it)">
                <KeyRound size={14} /> Save PIN
              </button>
            </form>
          </div>
        </div>

        {/* Jugs & balance */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Jugs</h2>
            <div className="mb-3 flex items-end gap-6">
              <div>
                <div className="text-3xl font-bold tabular-nums">{customer.jugsWithCustomer}</div>
                <div className="text-xs text-slate-500">our jugs at customer</div>
              </div>
              <div>
                <div className="text-3xl font-bold tabular-nums">{customer.jugDeposits}</div>
                <div className="text-xs text-slate-500">jugs they own</div>
              </div>
            </div>
            <form action={adjustJugs} className="flex gap-2">
              <input name="delta" type="number" className="input w-24" placeholder="-2" required />
              <select name="reason" className="input flex-1">
                <option value="return">Empties returned</option>
                <option value="delivery">Jugs dropped off</option>
                <option value="lost">Lost / damaged</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <button className="btn-secondary">Apply</button>
            </form>
            <p className="mt-1 text-xs text-slate-400">Negative = jugs came back to the van.</p>
          </div>

          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Balance</h2>
            <div className={`text-3xl font-bold tabular-nums ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {money(balance)}
            </div>
            <div className="text-xs text-slate-500">{balance > 0 ? 'owed to you' : 'all settled'}</div>
            <div className="mt-3 flex gap-2">
              <LinkButton href={`/invoices/new?customer=${customer.id}`} variant="secondary">
                Create invoice
              </LinkButton>
              <LinkButton href={`/invoices?customer=${customer.id}`} variant="secondary">
                Invoices
              </LinkButton>
            </div>
            {customer.payments.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2 text-sm dark:border-navy-800">
                <div className="mb-1 text-xs font-semibold text-slate-500">Recent payments</div>
                {customer.payments.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex justify-between py-0.5">
                    <span className="text-slate-500">
                      {shortDate(p.receivedAt)} · {p.method}
                    </span>
                    <span className="tabular-nums">{money(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Communication log */}
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">Communication log</h2>
          <form action={logComm} className="mb-3 space-y-2">
            <div className="flex gap-2">
              <select name="channel" className="input w-32">
                <option value="NOTE">Note</option>
                <option value="CALL">Call</option>
                <option value="TEXT">Text</option>
                <option value="EMAIL">Email</option>
                <option value="IN_PERSON">In person</option>
              </select>
              <input name="note" className="input flex-1" placeholder="What happened?" required />
            </div>
            <button className="btn-secondary w-full">Log it</button>
          </form>
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {customer.commLogs.map((log) => (
              <li key={log.id} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-navy-800/50">
                <div className="text-xs text-slate-400">
                  {shortDate(log.createdAt)} · {log.channel}
                </div>
                {log.note}
              </li>
            ))}
            {customer.commLogs.length === 0 && <li className="text-slate-400">No entries yet.</li>}
          </ul>
        </div>
      </div>

      {/* Delivery history */}
      <div className="card mt-4 overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-semibold">Delivery history</h2>
          <Link href={`/orders?customer=${customer.id}`} className="text-sm text-aqua-600 hover:underline">
            View all
          </Link>
        </div>
        <table className="table-base mt-2 min-w-[560px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Items</th>
              <th className="text-right">Jugs returned</th>
              <th className="text-right">Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {customer.orders.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/orders/${o.id}`} className="text-navy-700 hover:underline dark:text-aqua-300">
                    {shortDate(o.deliveryDate)}
                  </Link>
                </td>
                <td className="text-slate-500">
                  {o.items.map((i) => `${i.quantity}× ${i.description ?? i.productType}`).join(', ') || '—'}
                </td>
                <td className="text-right tabular-nums">{o.jugsReturned}</td>
                <td className="text-right tabular-nums">{money(o.total)}</td>
                <td>
                  <Badge tone={ORDER_STATUS_TONE[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                </td>
              </tr>
            ))}
            {customer.orders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No deliveries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
