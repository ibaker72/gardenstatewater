import Link from 'next/link';
import { Check, Phone, X } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { shortDate } from '@/lib/format';
import { approvePortalRequest, declinePortalRequest } from '@/server/actions/portal-admin';
import { Badge, EmptyState, PageHeader } from '@/components/ui';
import type { Prisma } from '@prisma/client';

const KIND_LABEL: Record<string, string> = {
  EXTRA_DELIVERY: 'Extra delivery',
  PAUSE: 'Pause service',
  RESUME: 'Resume service',
  CONTACT_UPDATE: 'Info change',
  CANCEL: 'Cancel service',
  OTHER: 'Other',
};

/** What the Approve button will do, per kind — shown as the button title. */
const APPROVE_HINT: Record<string, string> = {
  EXTRA_DELIVERY: 'Create the order and text the customer a confirmation',
  PAUSE: 'Pause their deliveries',
  RESUME: 'Resume their deliveries',
  CONTACT_UPDATE: 'Apply the requested changes to their profile',
  CANCEL: 'Mark the customer churned',
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const { kind, q } = await searchParams;

  const where: Prisma.PortalRequestWhereInput = { resolved: false };
  if (kind) where.kind = kind;
  if (q) where.customer = { name: { contains: q, mode: 'insensitive' } };

  const requests = await prisma.portalRequest.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader title="Portal requests" subtitle="What customers asked for from their portal." />

      {/* Filters */}
      <form className="card mb-4 flex flex-wrap items-end gap-2 p-3" method="GET">
        <div className="min-w-36 flex-1">
          <label className="label">Type</label>
          <select name="kind" defaultValue={kind ?? ''} className="input">
            <option value="">All types</option>
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-40 flex-1">
          <label className="label">Customer</label>
          <input name="q" defaultValue={q ?? ''} className="input" placeholder="Search by name…" />
        </div>
        <button className="btn-secondary">Filter</button>
      </form>

      {requests.length === 0 ? (
        <EmptyState title="No open requests" hint="Customer requests from the portal land here." />
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => {
            const approve = approvePortalRequest.bind(null, r.id);
            const decline = declinePortalRequest.bind(null, r.id);
            // Free-text delivery requests lack the data to auto-create an order.
            const canApprove =
              r.kind === 'EXTRA_DELIVERY' ? Boolean(r.requestedDate && r.jugs) : r.kind in APPROVE_HINT;
            return (
              <li key={r.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.kind === 'EXTRA_DELIVERY' ? 'blue' : r.kind === 'CANCEL' ? 'red' : 'amber'}>
                      {KIND_LABEL[r.kind] ?? r.kind}
                    </Badge>
                    <Link href={`/customers/${r.customerId}`} className="font-medium hover:underline">
                      {r.customer.name}
                    </Link>
                    <span className="text-xs text-slate-400">{shortDate(r.createdAt)}</span>
                    {r.requestedDate && (
                      <Badge tone="slate">for {shortDate(r.requestedDate)}</Badge>
                    )}
                  </div>
                  {r.detail && (
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{r.detail}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.customer.phone && (
                    <a href={`tel:${r.customer.phone}`} className="btn-secondary" title="Call the customer">
                      <Phone size={15} />
                    </a>
                  )}
                  {r.kind === 'EXTRA_DELIVERY' && !canApprove && (
                    <Link href={`/orders/new?customer=${r.customerId}`} className="btn-primary">
                      Create order
                    </Link>
                  )}
                  {canApprove && (
                    <form action={approve}>
                      <button className="btn-primary" title={APPROVE_HINT[r.kind]}>
                        <Check size={15} /> Approve
                      </button>
                    </form>
                  )}
                  <form action={decline}>
                    <button className="btn-secondary" title="Decline (logs it on the customer's profile)">
                      <X size={15} /> Decline
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
