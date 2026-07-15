/** The account fields a customer may ask to change from the portal. */
export interface AccountFields {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  deliveryNotes: string | null;
}

export const ACCOUNT_FIELD_LABELS: Record<keyof AccountFields, string> = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  address: 'Street address',
  city: 'City',
  zip: 'Zip',
  deliveryNotes: 'Delivery notes',
};

const clean = (v: string | null | undefined) => (v ?? '').trim();

const LABEL_TO_FIELD = Object.fromEntries(
  Object.entries(ACCOUNT_FIELD_LABELS).map(([field, label]) => [label, field])
) as Record<string, keyof AccountFields>;

/**
 * Human-readable list of requested changes ("Phone: (973) 555-0142 → (973)
 * 555-9999"), or an empty list when nothing actually differs — the owner
 * reviews these lines in the request inbox before applying anything.
 */
export function diffAccountChanges(current: AccountFields, requested: AccountFields): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(ACCOUNT_FIELD_LABELS) as (keyof AccountFields)[]) {
    const before = clean(current[key]);
    const after = clean(requested[key]);
    if (before !== after) {
      lines.push(`${ACCOUNT_FIELD_LABELS[key]}: ${before || '—'} → ${after || '—'}`);
    }
  }
  return lines;
}

/**
 * Inverse of diffAccountChanges: reads the "Label: before → after" lines
 * back into field values so the owner's Approve button can apply them.
 * Unrecognized lines are skipped rather than guessed at.
 */
export function parseAccountChangeLines(detail: string): Partial<AccountFields> {
  const changes: Partial<AccountFields> = {};
  for (const line of detail.split('\n')) {
    const colon = line.indexOf(': ');
    if (colon === -1) continue;
    const field = LABEL_TO_FIELD[line.slice(0, colon)];
    if (!field) continue;
    const rest = line.slice(colon + 2);
    const arrow = rest.lastIndexOf(' → ');
    if (arrow === -1) continue;
    const after = rest.slice(arrow + 3).trim();
    changes[field] = after === '—' ? null : after;
  }
  return changes;
}
