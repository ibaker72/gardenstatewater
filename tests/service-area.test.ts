import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeZip, resolveServiceAreaStatus } from '../src/lib/service-area';

describe('normalizeZip', () => {
  it('accepts a clean 5-digit ZIP', () => {
    assert.equal(normalizeZip('07102'), '07102');
  });

  it('trims surrounding whitespace', () => {
    assert.equal(normalizeZip('  07102  '), '07102');
  });

  it('rejects short, long, and non-numeric input', () => {
    assert.equal(normalizeZip('0710'), null);
    assert.equal(normalizeZip('071025'), null);
    assert.equal(normalizeZip('0710a'), null);
    assert.equal(normalizeZip('07102-1234'), null);
    assert.equal(normalizeZip(''), null);
    assert.equal(normalizeZip(null), null);
    assert.equal(normalizeZip(undefined), null);
  });
});

describe('resolveServiceAreaStatus', () => {
  const zones = [
    ['07102', '07103'],
    ['07017', '07018'],
  ];

  it('is active when a zone covers the ZIP', () => {
    assert.equal(resolveServiceAreaStatus('07102', zones), 'active');
    assert.equal(resolveServiceAreaStatus('07018', zones), 'active');
  });

  it('is unavailable when zones exist but none cover the ZIP', () => {
    assert.equal(resolveServiceAreaStatus('07999', zones), 'unavailable');
  });

  it('falls back to manual review when no zones are configured', () => {
    assert.equal(resolveServiceAreaStatus('07102', []), 'manual_review');
  });
});
