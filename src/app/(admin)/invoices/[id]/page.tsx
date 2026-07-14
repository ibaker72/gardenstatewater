import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ban, CreditCard, Send } from 'lucide-react';
import { getAppUrl } from '@/lib/env';
import { getConfig } from '@/lib/pricing';
import { prisma } from '@/lib/prisma';
import { stripeConfigured } from '@/lib/stripe';
import { fullAddress, money, shortDate } from '@/lib/format';
import {
  logInvoicePayment,
  sendInvoice,
  sendPaymentReminder,
  voidInvoice,
} from '@/server/actions/invoices';
import { Badge, INVOICE_STATUS_TONE, PageHeader } from '@/components/ui';
import { PrintButton } from '@/components/PrintButton';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, config] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        orders: { include: { items: true }, orderBy: { deliveryDate: 'asc' } },
        payments: { orderBy: { receivedAt: 'desc' } },
      },
    }),
    getConfig(),
  ]);
  if (!invoice) notFound();
  const balance = invoice.total - invoice.amountPaid;

  const send = sendInvoice.bind(null, invoice.id);
  const remind = sendPaymentReminder.bind(null, invoice.id);
  const doVoid = voidInvoice.bind(null, invoice.id);
  const pay = logInvoicePayment.bind(null, invoice.id);

  const appUrl = getAppUrl();
  const payUrl = `${appUrl}/api/pay/${invoice.id}`;

  return (
    <>
      <PageHeader
        title={`Invoice #${invoice.number}`}
        subtitle={`Issued ${shortDate(invoice.issueDate)} · due ${shortDate(invoice.dueDate)}`}
        actions={
          <>
            <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status.replace('_', ' ')}</Badge>
            <PrintButton />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Printable invoice document */}
        <div className="card p-6 lg:col-span-2">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="text-lg font-bold text-navy-900 dark:text-white">{config.businessName}</div>
              <div className="text-sm text-slate-500">
                {[config.businessAddress, config.businessPhone, config.businessEmail]
                  .filter(Boolean)
                  .join(' · ') || 'Water delivery · New Jersey'}
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold">Invoice #{invoice.number}</div>
              <div className="text-slate-500">Issued {shortDate(invoice.issueDate)}</div>
              <div className="text-slate-500">Due {shortDate(invoice.dueDate)}</div>
            </div>
          </div>

          <div className="mb-6 text-sm">
            <div className="label">Bill to</div>
            <div className="font-medium">{invoice.customer.name}</div>
            <div className="text-slate-500">{fullAddress(invoice.customer)}</div>
            {invoice.customer.email && <div className="text-slate-500">{invoice.customer.email}</div>}
          </div>

          <table className="table-base">
            <thead>
              <tr>
                <th>Delivery</th>
                <th>Items</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap">{shortDate(o.deliveryDate)}</td>
                  <td className="text-slate-500">
                    {o.items.map((i) => i.description ?? i.productType).join(', ')}
                  </td>
                  <td className="text-right tabular-nums">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="text-right text-slate-500">
                  Subtotal
                </td>
                <td className="text-right tabular-nums">{money(invoice.subtotal)}</td>
              </tr>
              {invoice.discount > 0 && (
                <tr>
                  <td colSpan={2} className="text-right text-emerald-600">
                    Discounts
                  </td>
                  <td className="text-right tabular-nums text-emerald-600">−{money(invoice.discount)}</td>
                </tr>
              )}
              {invoice.deliveryFees > 0 && (
                <tr>
                  <td colSpan={2} className="text-right text-slate-500">
                    Delivery fees
                  </td>
                  <td className="text-right tabular-nums">{money(invoice.deliveryFees)}</td>
                </tr>
              )}
              <tr className="text-base font-bold">
                <td colSpan={2} className="text-right">
                  Total
                </td>
                <td className="text-right tabular-nums">{money(invoice.total)}</td>
              </tr>
              {invoice.amountPaid > 0 && (
                <>
                  <tr>
                    <td colSpan={2} className="text-right text-slate-500">
                      Paid
                    </td>
                    <td className="text-right tabular-nums">−{money(invoice.amountPaid)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td colSpan={2} className="text-right">
                      Balance due
                    </td>
                    <td className="text-right tabular-nums">{money(balance)}</td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>
          {invoice.memo && <p className="mt-4 text-sm text-slate-500">Note: {invoice.memo}</p>}
        </div>

        {/* Actions */}
        <div className="no-print space-y-4">
          {invoice.status !== 'VOID' && balance > 0 && (
            <div className="card space-y-2 p-4">
              <h2 className="font-semibold">Collect</h2>
              {invoice.customer.email ? (
                <form action={send}>
                  <button className="btn-primary w-full">
                    <Send size={15} /> {invoice.sentAt ? 'Re-send invoice email' : 'Send invoice email'}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-slate-400">No email on file — add one to send invoices.</p>
              )}
              {invoice.sentAt && invoice.customer.email && (
                <form action={remind}>
                  <button className="btn-secondary w-full">Send payment reminder</button>
                </form>
              )}
              {stripeConfigured() ? (
                <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-navy-800/50">
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <CreditCard size={13} /> Online payment link
                  </div>
                  <code className="break-all text-aqua-600">{payUrl}</code>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Add Stripe keys to enable online payment links.
                </p>
              )}
            </div>
          )}

          {invoice.status !== 'VOID' && balance > 0 && (
            <form action={pay} className="card space-y-3 p-4">
              <h2 className="font-semibold">Log manual payment</h2>
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
                  <input type="number" step="0.01" name="amount" defaultValue={balance.toFixed(2)} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Reference</label>
                <input name="reference" className="input" placeholder="@venmo-handle, check #…" />
              </div>
              <button className="btn-primary w-full">Record payment</button>
            </form>
          )}

          {invoice.payments.length > 0 && (
            <div className="card p-4 text-sm">
              <h2 className="mb-2 font-semibold">Payments</h2>
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex justify-between py-1">
                  <span className="text-slate-500">
                    {shortDate(p.receivedAt)} · {p.method}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </span>
                  <span className="tabular-nums">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card space-y-2 p-4">
            <Link href={`/customers/${invoice.customerId}/statement`} className="btn-secondary w-full">
              Monthly statement
            </Link>
            {invoice.status !== 'VOID' && invoice.status !== 'PAID' && (
              <form action={doVoid}>
                <button className="btn-secondary w-full text-red-600">
                  <Ban size={14} /> Void invoice
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
