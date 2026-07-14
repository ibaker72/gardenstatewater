process.env.DATABASE_URL ??= 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
process.env.DIRECT_URL ??= process.env.DATABASE_URL;

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPin, normalizePhone, sha256 } from '../src/lib/portal-auth';

describe('normalizePhone', () => {
  it('reduces formatted US numbers to 10 digits', () => {
    assert.equal(normalizePhone('(973) 555-0142'), '9735550142');
    assert.equal(normalizePhone('973.555.0142'), '9735550142');
    assert.equal(normalizePhone('973 555 0142'), '9735550142');
  });
  it('strips a leading country code 1', () => {
    assert.equal(normalizePhone('+1 973 555 0142'), '9735550142');
    assert.equal(normalizePhone('19735550142'), '9735550142');
  });
  it('rejects garbage and wrong lengths', () => {
    assert.equal(normalizePhone('555-0142'), null);
    assert.equal(normalizePhone(''), null);
    assert.equal(normalizePhone(null), null);
    assert.equal(normalizePhone('not a phone'), null);
  });
});

describe('hashing', () => {
  it('sha256 is deterministic and hex-shaped', () => {
    assert.equal(sha256('abc'), sha256('abc'));
    assert.match(sha256('abc'), /^[0-9a-f]{64}$/);
  });
  it('the same PIN hashes differently per customer', () => {
    assert.notEqual(hashPin('cust_a', '1234'), hashPin('cust_b', '1234'));
    assert.equal(hashPin('cust_a', '1234'), hashPin('cust_a', '1234'));
  });
});
