import { prisma } from '@/lib/prisma';
import { getConfig } from '@/lib/pricing';
import { isoDate } from '@/lib/format';
import { createOrder } from '@/server/actions/orders';
import { PageHeader } from '@/components/ui';

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: { customer?: string };
}) {
  const [customers, config] = await Promise.all([
    prisma.customer.findMany({
      where: { status: { in: ['ACTIVE', 'PAUSED'] } },
      orderBy: { name: 'asc' },
      include: { zone: true },
    }),
    getConfig(),
  ]);

  return (
    <>
      <PageHeader
        title="New order"
        subtitle="Prices, plan discounts, and zone fees are applied automatically."
      />
      <form action={createOrder} className="card max-w-xl space-y-4 p-4 md:p-6">
        <div>
          <label className="label">Customer *</label>
          <select name="customerId" required defaultValue={searchParams.customer ?? ''} className="input">
            <option value="" disabled>
              Select customer…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.address} {c.zone ? `(${c.zone.name})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Delivery date *</label>
          <input type="date" name="deliveryDate" required defaultValue={isoDate(new Date())} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Jug refills (${config.jugRefillPrice})</label>
            <input type="number" name="refillJugs" min={0} defaultValue={2} className="input" />
          </div>
          <div>
            <label className="label">New jugs (${config.jugPurchasePrice})</label>
            <input type="number" name="newJugs" min={0} defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Bottle cases (${config.bottleCasePrice})</label>
            <input type="number" name="bottleCases" min={0} defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Dispenser rental months (${config.dispenserRentalPrice}/mo)</label>
            <input type="number" name="dispenserMonths" min={0} defaultValue={0} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Special instructions</label>
          <input name="instructions" className="input" placeholder="Optional" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="notifyCustomer" defaultChecked className="h-4 w-4" />
          Text the customer a delivery confirmation
        </label>
        <button type="submit" className="btn-primary w-full md:w-auto">
          Create order
        </button>
      </form>
    </>
  );
}
