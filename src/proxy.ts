import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getOwnerEmail, getSupabaseEnv } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Routes that never require the owner session.
const PUBLIC_PREFIXES = [
  '/login',
  '/portal',
  '/api/stripe/webhook',
  '/api/cron',
  '/api/portal',
  '/api/pay',
  '/api/auth',
  '/api/health',
  '/sw.js',
  '/manifest.webmanifest',
  '/portal.webmanifest',
  '/offline',
  '/offline.html', // the SW precaches this at install — it must never redirect to /login
];

/**
 * Send the visitor to /login instead of rendering the requested page.
 * Everything that isn't "verified owner" funnels through here — including
 * broken auth configuration — so a bad env var can lock the site down but
 * can never turn every route into a plain 500 (the July 2026 outage) or,
 * worse, drop the auth wall.
 */
function redirectToLogin(
  request: NextRequest,
  pathname: string,
  extraParams: Record<string, string> = {}
) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', pathname);
  for (const [key, value] of Object.entries(extraParams)) {
    loginUrl.searchParams.set(key, value);
  }
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const supabaseEnv = getSupabaseEnv();
  // Local dev without Supabase configured: no auth wall.
  if (supabaseEnv.status === 'unconfigured') return NextResponse.next();
  if (supabaseEnv.status === 'invalid') {
    // Set but unusable (stray quotes, missing protocol, half-configured…).
    // Fail closed with an explanation instead of crashing the middleware.
    console.error(`[auth] Supabase env is invalid: ${supabaseEnv.problem}`);
    return redirectToLogin(request, pathname, { error: 'config' });
  }

  let response = NextResponse.next({ request });
  let user: { email?: string } | null = null;
  try {
    const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (e) {
    // Supabase unreachable or misbehaving — fail closed, don't 500 the site.
    console.error(
      `[auth] Failed to resolve session: ${e instanceof Error ? e.message : String(e)}`
    );
    return redirectToLogin(request, pathname, { error: 'auth-unavailable' });
  }

  const ownerEmail = getOwnerEmail();
  const isOwner = Boolean(
    user?.email && ownerEmail && user.email.trim().toLowerCase() === ownerEmail
  );

  if (!isOwner) {
    // Signed in but rejected — tell the login page why so it can explain
    // (OWNER_EMAIL unset vs. signed in with a different account).
    const extra: Record<string, string> = {};
    if (user?.email) {
      extra.denied = user.email;
      if (!ownerEmail) extra.reason = 'owner-unset';
    }
    return redirectToLogin(request, pathname, extra);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
