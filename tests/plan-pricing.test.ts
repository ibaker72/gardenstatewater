import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  annualMonthlyEquivalent,
  annualPrice,
  displayPrice,
  firstDeliveryDiscountCents,
  perJugPrice,
  toCents,
} from '../src/lib/plan-pricing';

describe('toCents', () => {
  it('rounds without float drift', () => {
    assert.equal(toCents(39), 3900);
    assert.equal(toCents(11.99), 1199);
    assert.equal(toCents(69 * 11), 75900);
  });
});

describe('annualPrice', () => {
  it('gives one month free on the spec plans', () => {
    assert.equal(annualPrice(39, 1), 429); // Hydrate: 39 × 11
    assert.equal(annualPrice(69, 1), 759); // Family: 69 × 11
  });

  it('clamps free months to sane bounds', () => {
    assert.equal(annualPrice(39, 0), 468);
    assert.equal(annualPrice(39, 100), 39); // never below one billed month
  });
});

describe('annualMonthlyEquivalent', () => {
  it('shows the per-month cost of annual billing', () => {
    assert.equal(annualMonthlyEquivalent(39, 1), 35.75);
    assert.equal(annualMonthlyEquivalent(69, 1), 63.25);
  });
});

describe('perJugPrice', () => {
  it('matches the marketing math from the spec', () => {
    assert.equal(perJugPrice(39, 4), 9.75); // "works out to $9.75/jug"
    assert.equal(perJugPrice(69, 8), 8.63); // "works out to $8.63/jug"
  });

  it('degrades safely on zero jugs', () => {
    assert.equal(perJugPrice(39, 0), 39);
  });
});

describe('firstDeliveryDiscountCents', () => {
  it('is half of one weekly delivery at 50%', () => {
    // Hydrate: $39/mo over 4 deliveries = $9.75; 50% = $4.88.
    assert.equal(firstDeliveryDiscountCents(39, 50), 488);
    // Family: $69/mo → $17.25/delivery; 50% = $8.63.
    assert.equal(firstDeliveryDiscountCents(69, 50), 863);
  });

  it('never goes negative', () => {
    assert.equal(firstDeliveryDiscountCents(39, -10), 0);
    assert.equal(firstDeliveryDiscountCents(39, 0), 0);
  });
});

describe('displayPrice', () => {
  it('drops needless cents but keeps real ones', () => {
    assert.equal(displayPrice(39), '$39');
    assert.equal(displayPrice(11.99), '$11.99');
    assert.equal(displayPrice(35.75), '$35.75');
    assert.equal(displayPrice(8.63), '$8.63');
  });
});
