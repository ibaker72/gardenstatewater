import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { diffAccountChanges, type AccountFields } from '../src/lib/account-changes';

const onFile: AccountFields = {
  name: 'Maria Alvarez',
  phone: '(973) 555-0142',
  email: 'maria@example.com',
  address: '212 Ferry St',
  city: 'Newark',
  zip: '07105',
  deliveryNotes: 'Ring bell twice',
};

describe('diffAccountChanges', () => {
  it('returns nothing when nothing changed (including whitespace-only edits)', () => {
    assert.deepEqual(diffAccountChanges(onFile, { ...onFile }), []);
    assert.deepEqual(diffAccountChanges(onFile, { ...onFile, name: '  Maria Alvarez  ' }), []);
  });

  it('lists only the fields that differ, with before → after', () => {
    const lines = diffAccountChanges(onFile, {
      ...onFile,
      phone: '(973) 555-9999',
      deliveryNotes: 'Leave at side gate',
    });
    assert.deepEqual(lines, [
      'Phone: (973) 555-0142 → (973) 555-9999',
      'Delivery notes: Ring bell twice → Leave at side gate',
    ]);
  });

  it('shows cleared and newly-set fields with a dash', () => {
    const lines = diffAccountChanges(
      { ...onFile, email: null },
      { ...onFile, email: 'new@example.com', deliveryNotes: null }
    );
    assert.deepEqual(lines, [
      'Email: — → new@example.com',
      'Delivery notes: Ring bell twice → —',
    ]);
  });
});
