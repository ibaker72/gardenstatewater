import { prisma } from '@/lib/prisma';
import { getConfig } from '@/lib/pricing';
import { money, shortDate } from '@/lib/format';
import {
  adjustStock,
  logSupplierPurchase,
  upsertInventoryItem,
  upsertSupplier,
} from '@/server/actions/inventory';
import { Badge, PageHeader, StatCard } from '@/components/ui';

export default async function InventoryPage() {
  const [config, items, suppliers, purchases, customerJugs] = await Promise.all([
    getConfig(),
    prisma.inventoryItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplierPurchase.findMany({
      orderBy: { date: 'desc' },
      take: 10,
      include: { supplier: true },
    }),
    prisma.customer.aggregate({ _sum: { jugsWithCustomer: true } }),
  ]);

  const jug = items.find((i) => i.sku === 'JUG_5GAL');
  const jugsWithCustomers = customerJugs._sum.jugsWithCustomer ?? 0;
  const lost = await prisma.inventoryMovement.aggregate({
    where: { reason: { in: ['lost', 'damaged'] } },
    _sum: { delta: true },
  });
  const jugsLost = Math.abs(lost._sum.delta ?? 0);
  const totalOwned = (jug?.quantity ?? 0) + jugsWithCustomers;

  return (
    <>
      <PageHeader title="Inventory" subtitle="Jugs, supplies, and where your water comes from." />

      {/* Jug overview */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Jugs owned" value={totalOwned} sub="in stock + with customers" />
        <StatCard
          label="In stock"
          value={jug?.quantity ?? 0}
          tone={jug && jug.quantity < config.lowStockThreshold ? 'warn' : 'default'}
          sub={jug && jug.quantity < config.lowStockThreshold ? `below ${config.lowStockThreshold} threshold` : 'ready to fill'}
        />
        <StatCard label="With customers" value={jugsWithCustomers} sub="out in the field" />
        <StatCard label="Lost / damaged" value={jugsLost} tone={jugsLost > 0 ? 'warn' : 'default'} sub="all time" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Items table + adjust */}
        <div className="card overflow-x-auto p-4">
          <h2 className="mb-2 font-semibold">Stock levels</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const low = i.reorderThreshold > 0 && i.quantity <= i.reorderThreshold;
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-slate-400">
                        {i.sku} · {i.category}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">
                      {i.quantity} {i.unit !== 'unit' ? i.unit : ''}
                    </td>
                    <td className="text-right tabular-nums">{money(i.unitCost)}</td>
                    <td>
                      {low ? (
                        <Badge tone="amber">reorder {i.reorderAmount || i.reorderThreshold * 2}</Badge>
                      ) : (
                        <Badge tone="green">ok</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    No items yet — run the seed or add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <form action={adjustStock} className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-navy-800">
            <select name="itemId" required className="input min-w-36 flex-1">
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input type="number" name="delta" required placeholder="+10 / -3" className="input w-28" />
            <select name="reason" className="input w-36">
              <option value="purchase">Purchased</option>
              <option value="lost">Lost</option>
              <option value="damaged">Damaged</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <button className="btn-secondary">Apply</button>
          </form>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-aqua-600">Add new item</summary>
            <form action={upsertInventoryItem} className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input name="name" required className="input" placeholder="Jug caps" />
              </div>
              <div>
                <label className="label">SKU</label>
                <input name="sku" required className="input" placeholder="CAPS" />
              </div>
              <div>
                <label className="label">Category</label>
                <select name="category" className="input">
                  <option value="consumable">Consumable</option>
                  <option value="jug">Jug</option>
                  <option value="equipment">Equipment</option>
                </select>
              </div>
              <div>
                <label className="label">Starting qty</label>
                <input type="number" name="quantity" defaultValue={0} className="input" />
              </div>
              <div>
                <label className="label">Unit cost ($)</label>
                <input type="number" step="0.01" name="unitCost" defaultValue={0} className="input" />
              </div>
              <div>
                <label className="label">Unit</label>
                <input name="unit" defaultValue="unit" className="input" />
              </div>
              <div>
                <label className="label">Reorder at</label>
                <input type="number" name="reorderThreshold" defaultValue={0} className="input" />
              </div>
              <div>
                <label className="label">Reorder amount</label>
                <input type="number" name="reorderAmount" defaultValue={0} className="input" />
              </div>
              <div className="col-span-2">
                <button className="btn-secondary w-full">Add item</button>
              </div>
            </form>
          </details>
        </div>

        <div className="space-y-4">
          {/* Log purchase */}
          <form action={logSupplierPurchase} className="card space-y-3 p-4">
            <h2 className="font-semibold">Log water purchase</h2>
            {suppliers.length === 0 ? (
              <p className="text-sm text-slate-400">Add a supplier first (below).</p>
            ) : (
              <>
                <select name="supplierId" required className="input">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Gallons bought</label>
                    <input type="number" step="0.1" name="gallons" required className="input" />
                  </div>
                  <div>
                    <label className="label">Cost per gallon ($)</label>
                    <input type="number" step="0.01" name="costPerGallon" defaultValue={config.costPerGallon} className="input" />
                  </div>
                  <div>
                    <label className="label">Jugs filled (adds to stock)</label>
                    <input type="number" name="jugsFilled" defaultValue={0} className="input" />
                  </div>
                  <div>
                    <label className="label">Other costs ($)</label>
                    <input type="number" step="0.01" name="otherCost" defaultValue={0} className="input" />
                  </div>
                </div>
                <button className="btn-primary w-full">Log purchase</button>
                <p className="text-xs text-slate-400">
                  Cost per gallon feeds the profit calculator and per-delivery COGS automatically.
                </p>
              </>
            )}
          </form>

          {/* Suppliers */}
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Water sources</h2>
            <ul className="space-y-2 text-sm">
              {suppliers.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-200 p-3 dark:border-navy-800">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {[s.contact, s.phone, s.email].filter(Boolean).join(' · ') || 'no contact info'}
                  </div>
                </li>
              ))}
            </ul>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-aqua-600">Add supplier</summary>
              <form action={upsertSupplier} className="mt-3 space-y-2">
                <input name="name" required className="input" placeholder="Supplier name *" />
                <input name="contact" className="input" placeholder="Contact person" />
                <div className="grid grid-cols-2 gap-2">
                  <input name="phone" className="input" placeholder="Phone" />
                  <input name="email" className="input" placeholder="Email" />
                </div>
                <button className="btn-secondary w-full">Add supplier</button>
              </form>
            </details>
          </div>

          {/* Price history */}
          <div className="card overflow-x-auto p-4">
            <h2 className="mb-2 font-semibold">Purchase history</h2>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th className="text-right">Gallons</th>
                  <th className="text-right">$/gal</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{shortDate(p.date)}</td>
                    <td>{p.supplier.name}</td>
                    <td className="text-right tabular-nums">{p.gallons}</td>
                    <td className="text-right tabular-nums">{money(p.costPerGallon)}</td>
                    <td className="text-right tabular-nums">{money(p.total)}</td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      No purchases logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
