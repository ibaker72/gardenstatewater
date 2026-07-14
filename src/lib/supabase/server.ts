import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getOwnerEmail, getSupabaseEnv } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** True when Supabase env vars are present (even if malformed). */
export function supabaseConfigured() {
  return getSupabaseEnv().status !== 'unconfigured';
}

/** Server-side Supabase client bound to the request cookies. Null when auth isn't usable. */
export async function createClient() {
  const env = getSupabaseEnv();
  if (env.status !== 'ok') return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — middleware handles refresh.
        }
      },
    },
  });
}

/** The signed-in user's email, or null. In dev mode (no Supabase configured) returns the owner email. */
export async function getSessionEmail(): Promise<string | null> {
  // Truly unconfigured = local dev mode; invalid config must NOT open the door.
  if (getSupabaseEnv().status === 'unconfigured') {
    return getOwnerEmail() ?? 'dev@local';
  }
  const supabase = await createClient();
  if (!supabase) return null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

export async function isOwner(): Promise<boolean> {
  if (getSupabaseEnv().status === 'unconfigured') return true; // local dev
  const email = await getSessionEmail();
  if (!email) return false;
  const ownerEmail = getOwnerEmail();
  return Boolean(ownerEmail) && email.trim().toLowerCase() === ownerEmail;
}
