import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeZip, resolvePublicArea, resolveServiceAreaStatus } from '../src/lib/service-area';

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

describe('resolvePublicArea', () => {
  const morristown = { zip: '07960', town: 'Morristown', state: 'NJ', active: true };
  const zones = [['07102', '07103']];

  it('returns the town for an active serviceable ZIP', () => {
    assert.deepEqual(resolvePublicArea('07960', morristown, [], true), {
      status: 'active',
      town: 'Morristown',
      state: 'NJ',
    });
  });

  it('ignores an inactive serviceable ZIP', () => {
    const inactive = { ...morristown, active: false };
    assert.equal(resolvePublicArea('07960', inactive, [], true).status, 'unavailable');
  });

  it('falls back to operational zone ZIPs without naming a town', () => {
    assert.deepEqual(resolvePublicArea('07102', null, zones, false), { status: 'active' });
  });

  it('is unavailable when lists exist but nothing matches', () => {
    assert.equal(resolvePublicArea('99999', null, zones, true).status, 'unavailable');
  });

  it('degrades to manual review when nothing is configured at all', () => {
    assert.equal(resolvePublicArea('07960', null, [], false).status, 'manual_review');
  });
});
