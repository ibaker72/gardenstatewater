import Link from 'next/link';
import { Check } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { shortDate } from '@/lib/format';
import { resolvePortalRequest } from '@/server/actions/portal';
import { Badge, EmptyState, PageHeader } from '@/components/ui';

const KIND_LABEL: Record<string, string> = {
  EXTRA_DELIVERY: 'Extra delivery',
  PAUSE: 'Pause service',
  RESUME: 'Resume service',
  CONTACT_UPDATE: 'Info change',
  CANCEL: 'Cancel service',
  OTHER: 'Other',
};

export default async function RequestsPage() {
  const requests = await prisma.portalRequest.findMany({
    where: { resolved: false },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader title="Portal requests" subtitle="What customers asked for from their portal." />
      {requests.length === 0 ? (
        <EmptyState title="No open requests" hint="Customer requests from the portal land here." />
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => {
            const resolve = resolvePortalRequest.bind(null, r.id);
            return (
              <li key={r.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.kind === 'EXTRA_DELIVERY' ? 'blue' : r.kind === 'CANCEL' ? 'red' : 'amber'}>
                      {KIND_LABEL[r.kind] ?? r.kind}
                    </Badge>
                    <Link href={`/customers/${r.customerId}`} className="font-medium hover:underline">
                      {r.customer.name}
                    </Link>
                    <span className="text-xs text-slate-400">{shortDate(r.createdAt)}</span>
                  </div>
                  {r.detail && <p className="mt-1 text-sm text-slate-500">{r.detail}</p>}
                </div>
                {r.kind === 'EXTRA_DELIVERY' && (
                  <Link href={`/orders/new?customer=${r.customerId}`} className="btn-primary">
                    Create order
                  </Link>
                )}
                <form action={resolve}>
                  <button className="btn-secondary" title="Mark resolved">
                    <Check size={15} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
