'use client';

import type { Customer, Zone } from '@prisma/client';
import { useFormStatus } from 'react-dom';
import { WEEKDAYS } from '@/lib/format';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full md:w-auto">
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function CustomerForm({
  customer,
  zones,
  action,
}: {
  customer?: Customer | null;
  zones: Zone[];
  action: (form: FormData) => Promise<void>;
}) {
  const c = customer;
  return (
    <form action={action} className="card max-w-2xl space-y-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label">Name *</label>
          <input name="name" required defaultValue={c?.name} className="input" placeholder="Jane Smith" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            pattern="[+]?[0-9()\-.\s]{7,20}"
            title="Enter a phone number, e.g. (908) 555-0101"
            defaultValue={c?.phone ?? ''}
            className="input"
            placeholder="(908) 555-0101"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={c?.email ?? ''} className="input" placeholder="jane@email.com" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Street address *</label>
          <input name="address" required defaultValue={c?.address} className="input" placeholder="123 Main St" />
        </div>
        <div>
          <label className="label">City</label>
          <input name="city" defaultValue={c?.city ?? ''} className="input" placeholder="Newark" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">State</label>
            <input name="state" defaultValue={c?.state ?? 'NJ'} className="input" />
          </div>
          <div>
            <label className="label">Zip</label>
            <input name="zip" defaultValue={c?.zip ?? ''} className="input" placeholder="07102" />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="label">Delivery notes</label>
          <input
            name="deliveryNotes"
            defaultValue={c?.deliveryNotes ?? ''}
            className="input"
            placeholder='e.g. "leave at back gate, dog is friendly"'
          />
        </div>
        <div>
          <label className="label">Account type</label>
          <select name="accountType" defaultValue={c?.accountType ?? 'RESIDENTIAL'} className="input">
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="EVENT">Event</option>
          </select>
        </div>
        <div>
          <label className="label">Delivery zone</label>
          <select name="zoneId" defaultValue={c?.zoneId ?? 'auto'} className="input">
            <option value="auto">Auto (match by zip)</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} {z.deliveryFee > 0 ? `(+$${z.deliveryFee})` : '(free delivery)'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Subscription plan</label>
          <select name="plan" defaultValue={c?.plan ?? 'ON_DEMAND'} className="input">
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="ON_DEMAND">On-demand</option>
          </select>
        </div>
        <div>
          <label className="label">Jugs per delivery</label>
          <input name="planJugs" type="number" min={1} defaultValue={c?.planJugs ?? 2} className="input" />
        </div>
        <div>
          <label className="label">Preferred delivery day</label>
          <select name="preferredDay" defaultValue={c?.preferredDay ?? ''} className="input">
            <option value="">No preference</option>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Jugs currently at customer</label>
          <input
            name="jugsWithCustomer"
            type="number"
            min={0}
            defaultValue={c?.jugsWithCustomer ?? 0}
            className="input"
          />
        </div>
        <div>
          <label className="label">Preferred payment method</label>
          <select name="paymentPref" defaultValue={c?.paymentPref ?? ''} className="input">
            <option value="">No preference</option>
            <option value="CASH">Cash</option>
            <option value="VENMO">Venmo</option>
            <option value="CASHAPP">CashApp</option>
            <option value="ZELLE">Zelle</option>
            <option value="STRIPE">Online (card)</option>
            <option value="CHECK">Check</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="dispenserRental"
              defaultChecked={c?.dispenserRental ?? false}
              className="h-5 w-5"
            />
            Renting a dispenser (monthly fee)
          </label>
        </div>
        <div>
          <label className="label">Birthday (loyalty messages)</label>
          <input
            name="birthday"
            type="date"
            defaultValue={c?.birthday ? new Date(c.birthday).toISOString().slice(0, 10) : ''}
            className="input"
          />
        </div>
      </div>
      <SubmitButton label={c ? 'Save changes' : 'Add customer'} />
    </form>
  );
}
