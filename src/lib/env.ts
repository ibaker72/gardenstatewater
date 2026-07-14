/**
 * Centralized environment access.
 *
 * Every value read here is sanitized (trimmed, stripped of accidental
 * wrapping quotes — the classic "pasted a .env line into the Vercel
 * dashboard" mistake) and URLs are validated before use, so a malformed
 * variable degrades gracefully instead of crashing the whole app.
 *
 * This module must stay safe to import from anywhere (server, edge
 * middleware, client components) — it reads only NEXT_PUBLIC_* values and
 * platform variables, never secrets. Server secrets (STRIPE_SECRET_KEY,
 * DATABASE_URL, …) are read in their own server-only modules.
 *
 * NOTE: NEXT_PUBLIC_* variables are inlined at build time, so each one must
 * appear as a static `process.env.NEXT_PUBLIC_X` expression below.
 */

/** Canonical production URL — the single place it is hardcoded. */
export const PRODUCTION_APP_URL = 'https://gardenstatewater.com';

/**
 * Trim a raw env value and strip one pair of accidental wrapping quotes.
 * Returns undefined for unset/empty values so `??` fallbacks keep working.
 */
export function cleanEnv(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let value = raw.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

/** Parse a string as an http(s) URL, or return null. */
export function parseHttpUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isLocalhostUrl(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
}

/** A URL's href without any trailing slash, so `${getAppUrl()}/path` never double-slashes. */
function normalizeBase(url: URL): string {
  return url.href.replace(/\/+$/, '');
}

/**
 * The app's own base URL, always with a protocol and no trailing slash.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_APP_URL when it parses as a valid http(s) URL
 *     (in production a localhost value is ignored — a leftover dev value
 *     must never leak into Stripe redirect/email links);
 *  2. VERCEL_URL (deployment host, https assumed);
 *  3. the canonical production URL in production, http://localhost:3000 in dev.
 */
export function getAppUrl(): string {
  const isProd = process.env.NODE_ENV === 'production';

  const configured = parseHttpUrl(cleanEnv(process.env.NEXT_PUBLIC_APP_URL));
  if (configured && !(isProd && isLocalhostUrl(configured))) {
    return normalizeBase(configured);
  }

  const vercelHost = cleanEnv(process.env.VERCEL_URL);
  const vercel = vercelHost ? parseHttpUrl(`https://${vercelHost}`) : null;
  if (vercel) return normalizeBase(vercel);

  return isProd ? PRODUCTION_APP_URL : 'http://localhost:3000';
}

export type SupabaseEnv =
  /** Both values present and valid — auth is on. */
  | { status: 'ok'; url: string; anonKey: string }
  /** Nothing configured — local dev mode, no auth wall. */
  | { status: 'unconfigured' }
  /** Something is set but unusable — auth must fail CLOSED, never crash. */
  | { status: 'invalid'; problem: string };

/**
 * Validated Supabase auth configuration. Never throws.
 *
 * `invalid` (set-but-broken) is deliberately distinct from `unconfigured`
 * (dev mode): a typo in production must lock the site down to /login with an
 * explanation — not drop the auth wall, and not 500 every route from inside
 * the middleware (the July 2026 outage).
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url && !anonKey) return { status: 'unconfigured' };
  if (!url) {
    return { status: 'invalid', problem: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is set but NEXT_PUBLIC_SUPABASE_URL is missing or empty.' };
  }
  if (!anonKey) {
    return { status: 'invalid', problem: 'NEXT_PUBLIC_SUPABASE_URL is set but NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty.' };
  }

  const parsed = parseHttpUrl(url);
  if (!parsed) {
    return {
      status: 'invalid',
      problem:
        'NEXT_PUBLIC_SUPABASE_URL is not a valid http(s) URL — check for stray quotes, whitespace, or a missing https:// prefix (it should look like https://<project-ref>.supabase.co).',
    };
  }

  return { status: 'ok', url: normalizeBase(parsed), anonKey };
}

/** The owner's email (trimmed, lowercased), or undefined when unset. */
export function getOwnerEmail(): string | undefined {
  return cleanEnv(process.env.OWNER_EMAIL)?.toLowerCase();
}
