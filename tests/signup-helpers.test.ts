import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextDeliveryDate, planToCrmFields } from '../src/lib/signup-helpers';

describe('planToCrmFields', () => {
  it('maps the subscription tiers onto weekly CRM plans', () => {
    assert.deepEqual(planToCrmFields({ isSubscription: true, jugsPerMonth: 4 }), {
      plan: 'WEEKLY',
      planJugs: 1,
    });
    assert.deepEqual(planToCrmFields({ isSubscription: true, jugsPerMonth: 8 }), {
      plan: 'WEEKLY',
      planJugs: 2,
    });
    assert.deepEqual(planToCrmFields({ isSubscription: true, jugsPerMonth: 12 }), {
      plan: 'WEEKLY',
      planJugs: 3,
    });
  });

  it('maps one-time tiers onto on-demand with the chosen jug count', () => {
    assert.deepEqual(planToCrmFields({ isSubscription: false, jugsPerMonth: 1 }, 3), {
      plan: 'ON_DEMAND',
      planJugs: 3,
    });
    assert.deepEqual(planToCrmFields({ isSubscription: false, jugsPerMonth: 1 }), {
      plan: 'ON_DEMAND',
      planJugs: 2,
    });
  });
});

describe('nextDeliveryDate', () => {
  // A fixed Wednesday for deterministic weekday math.
  const wednesday = new Date('2026-07-22T15:30:00');

  it('is the minimum lead time out with no preference', () => {
    const date = nextDeliveryDate(null, wednesday);
    assert.equal(date.getDay(), 5); // Wed + 2 = Friday
    assert.equal(date.getHours(), 0);
  });

  it('lands on the preferred weekday at least two days out', () => {
    // Preferred Monday, asked on Wednesday → next Monday.
    assert.equal(nextDeliveryDate(1, wednesday).getDay(), 1);
    // Preferred Friday, asked on Wednesday → this Friday (exactly 2 days out).
    const friday = nextDeliveryDate(5, wednesday);
    assert.equal(friday.getDay(), 5);
    assert.equal(friday.getDate(), 24);
    // Preferred Thursday, asked on Wednesday → NEXT Thursday (tomorrow is too soon).
    const thursday = nextDeliveryDate(4, wednesday);
    assert.equal(thursday.getDay(), 4);
    assert.equal(thursday.getDate(), 30);
  });

  it('ignores out-of-range weekday values', () => {
    assert.equal(nextDeliveryDate(9 as never, wednesday).getDay(), 5);
  });
});
