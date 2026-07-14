import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  cleanEnv,
  getAppUrl,
  getSupabaseEnv,
  parseHttpUrl,
  PRODUCTION_APP_URL,
} from '../src/lib/env';

const ENV_KEYS = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_URL',
  'VERCEL_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

// @types/node marks NODE_ENV readonly; tests legitimately swap it around.
const env = process.env as Record<string, string | undefined>;

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) {
    const value = values[key];
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete env[key];
    else env[key] = saved[key];
  }
});

describe('cleanEnv', () => {
  it('trims whitespace', () => {
    assert.equal(cleanEnv('  hello  '), 'hello');
  });
  it('strips accidental wrapping double quotes', () => {
    assert.equal(cleanEnv('"https://example.com"'), 'https://example.com');
  });
  it('strips accidental wrapping single quotes and re-trims', () => {
    assert.equal(cleanEnv(" ' https://example.com ' "), 'https://example.com');
  });
  it('returns undefined for unset/empty/quotes-only values', () => {
    assert.equal(cleanEnv(undefined), undefined);
    assert.equal(cleanEnv(''), undefined);
    assert.equal(cleanEnv('   '), undefined);
    assert.equal(cleanEnv('""'), undefined);
  });
  it('leaves interior quotes alone', () => {
    assert.equal(cleanEnv('a"b'), 'a"b');
  });
});

describe('parseHttpUrl', () => {
  it('accepts http and https', () => {
    assert.equal(parseHttpUrl('https://example.com')?.hostname, 'example.com');
    assert.equal(parseHttpUrl('http://localhost:3000')?.port, '3000');
  });
  it('rejects garbage, missing protocol, and non-http schemes', () => {
    assert.equal(parseHttpUrl('not a url'), null);
    assert.equal(parseHttpUrl('gardenstatewater.com'), null);
    assert.equal(parseHttpUrl('ftp://example.com'), null);
    assert.equal(parseHttpUrl(undefined), null);
  });
});

describe('getAppUrl', () => {
  it('uses a valid configured URL and strips the trailing slash', () => {
    setEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://gardenstatewater.com/' });
    assert.equal(getAppUrl(), 'https://gardenstatewater.com');
  });

  it('recovers a value pasted with quotes and whitespace', () => {
    setEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: ' "https://gardenstatewater.com" ' });
    assert.equal(getAppUrl(), 'https://gardenstatewater.com');
  });

  it('never returns localhost in production (falls back to VERCEL_URL)', () => {
    setEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      VERCEL_URL: 'gardenstatewater-abc.vercel.app',
    });
    assert.equal(getAppUrl(), 'https://gardenstatewater-abc.vercel.app');
  });

  it('never returns localhost in production (falls back to the canonical URL)', () => {
    setEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' });
    assert.equal(getAppUrl(), PRODUCTION_APP_URL);
  });

  it('falls back to the canonical URL in production when the value is malformed', () => {
    setEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'gardenstatewater.com' });
    assert.equal(getAppUrl(), PRODUCTION_APP_URL);
  });

  it('falls back to the canonical URL in production when unset', () => {
    setEnv({ NODE_ENV: 'production' });
    assert.equal(getAppUrl(), PRODUCTION_APP_URL);
  });

  it('allows localhost outside production', () => {
    setEnv({ NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' });
    assert.equal(getAppUrl(), 'http://localhost:3000');
  });

  it('defaults to localhost outside production when unset', () => {
    setEnv({ NODE_ENV: 'development' });
    assert.equal(getAppUrl(), 'http://localhost:3000');
  });
});

describe('getSupabaseEnv', () => {
  it('is unconfigured when both values are absent', () => {
    setEnv({});
    assert.deepEqual(getSupabaseEnv(), { status: 'unconfigured' });
  });

  it('is ok (and cleaned) when both values are valid', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: ' "https://abc.supabase.co/" ',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ' anon-key ',
    });
    assert.deepEqual(getSupabaseEnv(), {
      status: 'ok',
      url: 'https://abc.supabase.co',
      anonKey: 'anon-key',
    });
  });

  it('is invalid when only one of the pair is set', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' });
    assert.equal(getSupabaseEnv().status, 'invalid');
    setEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' });
    assert.equal(getSupabaseEnv().status, 'invalid');
  });

  it('is invalid (not unconfigured, not ok) when the URL does not parse', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    const result = getSupabaseEnv();
    assert.equal(result.status, 'invalid');
    assert.match((result as { problem: string }).problem, /NEXT_PUBLIC_SUPABASE_URL/);
  });
});
