'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from '@/lib/env';

/** Browser Supabase client, or null when auth isn't configured (or misconfigured). */
export function createClient() {
  const env = getSupabaseEnv();
  if (env.status !== 'ok') return null;
  return createBrowserClient(env.url, env.anonKey);
}
