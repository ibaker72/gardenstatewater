import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Phone } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { fullAddress, money, shortDate, STATUS_LABELS } from '@/lib/format';
import {
  cancelOrder,
  logOrderPayment,
  markDelivered,
  setOrderStatus,
} from '@/server/actions/orders';
import { Badge, ORDER_STATUS_TONE, PageHeader } from '@/components/ui';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: { include: { zone: true } }, items: true, invoice: true },
  });
  if (!order) notFound();
  const c = order.customer;

  const deliver = markDelivered.bind(null, order.id);
  const pay = logOrderPayment.bind(null, order.id);

  async function toOutForDelivery() {
    'use server';
    await setOrderStatus(id, 'OUT_FOR_DELIVERY');
  }
  async function cancel() {
    'use server';
    await cancelOrder(id);
  }

  const refillCount = order.items
    .filter((i) => i.productType === 'JUG_REFILL')
    .reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <PageHeader
        title={`Order #${order.number}`}
        subtitle={`${shortDate(order.deliveryDate)} · ${c.name}`}
        actions={<Badge tone={ORDER_STATUS_TONE[order.status]}>{STATUS_LABELS[order.status]}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Delivery</h2>
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <a
              className="hover:underline"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(c))}`}
            >
              {fullAddress(c)}
            </a>
          </div>
          {c.phone && (
            <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm text-aqua-600 hover:underline">
              <Phone size={14} /> {c.phone}
            </a>
          )}
          {(order.instructions || c.deliveryNotes) && (
            <p className="rounded-lg bg-aqua-50 px-3 py-2 text-sm text-aqua-900 dark:bg-aqua-900/30 dark:text-aqua-100">
              📝 {order.instructions ?? c.deliveryNotes}
            </p>
          )}
          <Link href={`/customers/${c.id}`} className="text-sm text-aqua-600 hover:underline">
            View customer profile →
          </Link>

          <div className="border-t border-slate-100 pt-3 dark:border-navy-800">
            <table className="table-base">
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.description ?? i.productType}</td>
                    <td className="text-right tabular-nums">{money(i.lineTotal)}</td>
                  </tr>
                ))}
                {order.discount > 0 && (
                  <tr>
                    <td className="text-emerald-600">Plan discount</td>
                    <td className="text-right tabular-nums text-emerald-600">−{money(order.discount)}</td>
                  </tr>
                )}
                <tr>
                  <td>Delivery fee</td>
                  <td className="text-right tabular-nums">{money(order.deliveryFee)}</td>
                </tr>
                <tr className="font-bold">
                  <td>Total</td>
                  <td className="text-right tabular-nums">{money(order.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {order.invoice && (
            <p className="text-sm text-slate-500">
              Invoiced on{' '}
              <Link href={`/invoices/${order.invoice.id}`} className="text-aqua-600 hover:underline">
                invoice #{order.invoice.number}
              </Link>
            </p>
          )}
        </div>

        <div className="space-y-4">
          {order.status === 'SCHEDULED' && (
            <div className="card flex flex-wrap gap-2 p-4">
              <form action={toOutForDelivery}>
                <button className="btn-primary">Mark out for delivery</button>
              </form>
              <form action={cancel}>
                <button className="btn-secondary text-red-600">Cancel order</button>
              </form>
            </div>
          )}

          {(order.status === 'SCHEDULED' || order.status === 'OUT_FOR_DELIVERY') && (
            <form action={deliver} className="card space-y-3 p-4">
              <h2 className="font-semibold">Complete delivery</h2>
              <div>
                <label className="label">Empty jugs picked up</label>
                <input
                  type="number"
                  name="jugsReturned"
                  min={0}
                  defaultValue={Math.min(refillCount, c.jugsWithCustomer)}
                  className="input"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Customer currently holds {c.jugsWithCustomer} of your jugs.
                </p>
              </div>
              <button className="btn-primary w-full">Mark delivered</button>
            </form>
          )}

          {order.status === 'DELIVERED' && (
            <form action={pay} className="card space-y-3 p-4">
              <h2 className="font-semibold">Log payment</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Method</label>
                  <select name="method" className="input">
                    <option value="CASH">Cash</option>
                    <option value="VENMO">Venmo</option>
                    <option value="CASHAPP">CashApp</option>
                    <option value="ZELLE">Zelle</option>
                    <option value="CHECK">Check</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input type="number" step="0.01" name="amount" defaultValue={order.total} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Reference (optional)</label>
                <input name="reference" className="input" placeholder="Venmo @handle, check #…" />
              </div>
              <button className="btn-primary w-full">Record payment</button>
              <p className="text-xs text-slate-400">
                Collecting online instead? Create an invoice from the customer page to send a Stripe link.
              </p>
            </form>
          )}

          {order.status === 'PAID' && (
            <div className="card p-4 text-sm text-emerald-700 dark:text-emerald-300">
              Paid via {order.paymentMethod ?? '—'} · delivered {shortDate(order.deliveredAt)} ·{' '}
              {order.jugsReturned} empties returned.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
