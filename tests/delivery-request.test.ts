import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  contactStepSchema,
  deliveryRequestSchema,
  locationStepSchema,
} from '../src/lib/validation/delivery-request';

const validContact = {
  fullName: 'Jordan Rivera',
  phone: '(973) 555-8899',
  email: 'jordan@example.com',
  streetAddress: '12 Grove Street',
  addressLine2: '',
  city: 'Montclair',
  deliveryNotes: '',
};

const validRequest = {
  zip: '07042',
  customerType: 'home' as const,
  frequency: 'BIWEEKLY' as const,
  quantity: '3' as const,
  dispenser: 'BOTTOM_LOAD' as const,
  contact: validContact,
  serviceAreaStatus: 'unavailable' as const,
  website: '',
};

describe('locationStepSchema', () => {
  it('accepts a valid ZIP and customer type', () => {
    assert.ok(locationStepSchema.safeParse({ zip: '07042', customerType: 'business' }).success);
  });

  it('rejects malformed ZIPs', () => {
    assert.equal(locationStepSchema.safeParse({ zip: '742', customerType: 'home' }).success, false);
    assert.equal(locationStepSchema.safeParse({ zip: 'abcde', customerType: 'home' }).success, false);
  });
});

describe('contactStepSchema', () => {
  it('accepts a complete contact block', () => {
    assert.ok(contactStepSchema.safeParse(validContact).success);
  });

  it('requires at least one contact method', () => {
    const result = contactStepSchema.safeParse({ ...validContact, phone: '', email: '' });
    assert.equal(result.success, false);
  });

  it('accepts phone-only and email-only submissions', () => {
    assert.ok(contactStepSchema.safeParse({ ...validContact, email: '' }).success);
    assert.ok(contactStepSchema.safeParse({ ...validContact, phone: '' }).success);
  });

  it('rejects an incomplete phone number when one is given', () => {
    const result = contactStepSchema.safeParse({ ...validContact, phone: '973-555' });
    assert.equal(result.success, false);
  });

  it('rejects a malformed email when one is given', () => {
    const result = contactStepSchema.safeParse({ ...validContact, email: 'not-an-email' });
    assert.equal(result.success, false);
  });

  it('requires name, street address, and city', () => {
    assert.equal(contactStepSchema.safeParse({ ...validContact, fullName: '' }).success, false);
    assert.equal(contactStepSchema.safeParse({ ...validContact, streetAddress: '' }).success, false);
    assert.equal(contactStepSchema.safeParse({ ...validContact, city: '' }).success, false);
  });
});

describe('deliveryRequestSchema', () => {
  it('accepts a complete request', () => {
    assert.ok(deliveryRequestSchema.safeParse(validRequest).success);
  });

  it('rejects unknown enum values', () => {
    assert.equal(
      deliveryRequestSchema.safeParse({ ...validRequest, frequency: 'DAILY' }).success,
      false
    );
    assert.equal(
      deliveryRequestSchema.safeParse({ ...validRequest, dispenser: 'GOLD_PLATED' }).success,
      false
    );
  });

  it('lets a filled honeypot through validation so the server can decoy it', () => {
    const result = deliveryRequestSchema.safeParse({ ...validRequest, website: 'http://spam.example' });
    assert.ok(result.success);
    assert.equal(result.success && result.data.website, 'http://spam.example');
  });

  it('allows a null service-area status', () => {
    assert.ok(deliveryRequestSchema.safeParse({ ...validRequest, serviceAreaStatus: null }).success);
  });
});
