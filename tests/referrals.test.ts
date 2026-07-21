import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateReferralCode, normalizeReferralCode, REFERRAL_CODE_RE } from '../src/lib/referrals';

describe('generateReferralCode', () => {
  it('produces GSW-XXXXXX codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateReferralCode();
      assert.match(code, REFERRAL_CODE_RE);
      // No ambiguous characters (0/O, 1/I/L) in the suffix.
      assert.doesNotMatch(code.slice(4), /[01OIL]/);
    }
  });

  it('is deterministic with an injected rng', () => {
    assert.equal(generateReferralCode(() => 0), 'GSW-AAAAAA');
  });
});

describe('normalizeReferralCode', () => {
  it('uppercases and trims valid codes', () => {
    assert.equal(normalizeReferralCode(' gsw-ab23cd '), 'GSW-AB23CD');
    assert.equal(normalizeReferralCode('GSW-MARIA1'), 'GSW-MARIA1');
  });

  it('rejects malformed codes', () => {
    assert.equal(normalizeReferralCode('GSW-'), null);
    assert.equal(normalizeReferralCode('ABC-123456'), null);
    assert.equal(normalizeReferralCode('GSW-TOOLONG1'), null);
    assert.equal(normalizeReferralCode(''), null);
    assert.equal(normalizeReferralCode(null), null);
  });
});
