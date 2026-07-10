import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Server-side Supabase client bound to the request cookies. Null when auth isn't configured (local dev). */
export function createClient() {
  if (!supabaseConfigured()) return null;
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );
}

/** The signed-in user's email, or null. In dev mode (no Supabase configured) returns the owner email. */
export async function getSessionEmail(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return process.env.OWNER_EMAIL ?? 'dev@local';
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

export async function isOwner(): Promise<boolean> {
  const email = await getSessionEmail();
  if (!email) return false;
  if (!supabaseConfigured()) return true; // local dev
  const ownerEmail = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase();
  return Boolean(ownerEmail) && email.trim().toLowerCase() === ownerEmail;
}
